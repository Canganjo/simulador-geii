import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import type { Component } from '../core/model'
import type { ElementWaveform } from '../core/solver'
import { useCircuitStore } from '../store/circuitStore'
import { useLanguageStore } from '../store/languageStore'
import { useSimulationStore, type TransientData } from '../store/simulationStore'
import { downsample, nearestIndex, niceTicks, svgPath, timeConstant } from './chart'
import { formatSi } from './formatSi'
import { decimalSeparator, useT } from './i18n'

/**
 * Gráfico do transitório (E10-5): u(t) em cima e i(t) em baixo, com o MESMO eixo do tempo.
 *
 * Dois gráficos pequenos em vez de um com dois eixos verticais: com dois eixos, a posição das
 * curvas dependeria de duas escalas diferentes e enganava a leitura (regra de visualização).
 *
 * - Mostra o componente selecionado na cena (ou, sem seleção, o 1.º condensador/bobina).
 * - Cursor: passar o rato/dedo por cima mostra t, u e i nesse instante, nos dois gráficos.
 * - Linha tracejada = valor final; para C e L, marca em t = τ (63 % do caminho).
 */

/** Cores validadas contra o fundo escuro do painel (dataviz: banda de luminosidade, CVD). */
const COLORS = { voltage: '#d97706', current: '#0284c7' }
const PLOT_HEIGHT = 96
const MARGIN = { left: 60, right: 12, top: 8, bottom: 22 }
/** Máximo de fatias do traço (cada uma dá 2 pontos: mínimo e máximo). */
const MAX_BUCKETS = 400

export function WaveformChart() {
  const t = useT()
  const decimal = decimalSeparator(useLanguageStore((s) => s.language))
  const transient = useSimulationStore((s) => s.transient)
  const components = useCircuitStore((s) => s.components)
  const selectedId = useCircuitStore((s) => s.selectedId)
  const box = useRef<HTMLDivElement>(null)
  const width = useWidth(box)
  const [cursor, setCursor] = useState<number | null>(null)

  if (!transient) return null
  const withWave = components.filter((c) => transient.waveforms.has(c.id))
  const shown =
    withWave.find((c) => c.id === selectedId) ??
    withWave.find((c) => c.kind === 'capacitor' || c.kind === 'inductor') ??
    withWave[0]
  const wave = shown ? transient.waveforms.get(shown.id) : undefined

  return (
    <div
      ref={box}
      className="flex min-w-0 flex-1 flex-col gap-1"
      data-testid="waveform-chart"
      data-component={shown?.name ?? ''}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <label className="flex items-center gap-2 text-slate-300">
          {t('chart.component')}
          <select
            value={shown?.id ?? ''}
            onChange={(e) => useCircuitStore.getState().select(e.target.value)}
            className="rounded border border-slate-600 bg-slate-900 px-1.5 py-0.5 text-slate-100"
          >
            {withWave.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {shown && wave && (
          <Readout
            component={shown}
            transient={transient}
            wave={wave}
            index={cursor}
            decimal={decimal}
          />
        )}
      </div>

      {shown && wave && width > 0 && (
        <ChartPair
          component={shown}
          transient={transient}
          wave={wave}
          width={width}
          cursor={cursor}
          onCursor={setCursor}
          decimal={decimal}
        />
      )}
    </div>
  )
}

/** Largura do contentor, atualizada quando o painel muda de tamanho. */
function useWidth(ref: React.RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0))
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

/** τ medido: na tensão do condensador ou na corrente da bobina (as grandezas que não saltam). */
function measuredTau(c: Component, transient: TransientData, wave: ElementWaveform) {
  if (c.kind === 'capacitor') return timeConstant(transient.times, wave.voltage)
  if (c.kind === 'inductor') return timeConstant(transient.times, wave.current)
  return null
}

interface ReadoutProps {
  component: Component
  transient: TransientData
  wave: ElementWaveform
  /** Índice do instante debaixo do cursor (null → último instante). */
  index: number | null
  decimal: ',' | '.'
}

/** Linha com os valores no cursor (ou no fim) e o τ medido. */
function Readout({ component, transient, wave, index, decimal }: ReadoutProps) {
  const t = useT()
  const k = index ?? transient.times.length - 1
  const time = transient.times[k] ?? 0
  const u = wave.voltage[k] ?? 0
  const i = wave.current[k] ?? 0
  const tau = measuredTau(component, transient, wave)
  return (
    <p
      className="flex flex-wrap gap-x-3 text-slate-300 tabular-nums"
      data-testid="chart-readout"
      data-t={time}
      data-u={u}
      data-i={i}
    >
      <span>t = {formatSi(time, 's', 3, decimal)}</span>
      <span>
        <Swatch color={COLORS.voltage} /> u = {formatSi(u, 'V', 3, decimal)}
      </span>
      <span>
        <Swatch color={COLORS.current} /> i = {formatSi(i, 'A', 3, decimal)}
      </span>
      {tau !== null && (
        <span className="text-slate-400" data-testid="chart-tau" data-tau={tau}>
          {t('chart.tau', { tau: formatSi(tau, 's', 3, decimal) })}
        </span>
      )}
    </p>
  )
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="mr-0.5 inline-block h-0.5 w-3 align-middle"
      style={{ backgroundColor: color }}
    />
  )
}

interface ChartPairProps {
  component: Component
  transient: TransientData
  wave: ElementWaveform
  width: number
  cursor: number | null
  onCursor: (index: number | null) => void
  decimal: ',' | '.'
}

/** Os dois gráficos, um por cima do outro, com o mesmo eixo do tempo e o mesmo cursor. */
function ChartPair({
  component,
  transient,
  wave,
  width,
  cursor,
  onCursor,
  decimal,
}: ChartPairProps) {
  const t = useT()
  const { times } = transient
  const plotWidth = Math.max(40, width - MARGIN.left - MARGIN.right)
  const timeTicks = useMemo(() => niceTicks(0, transient.duration, 6), [transient.duration])
  const x = (time: number) =>
    MARGIN.left + ((time - timeTicks.min) / (timeTicks.max - timeTicks.min || 1)) * plotWidth
  const tau = measuredTau(component, transient, wave)

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    onCursor(nearestIndex(times, timeTicks.min + fraction * (timeTicks.max - timeTicks.min)))
  }

  const plot = (kind: 'voltage' | 'current', last: boolean) => (
    <Plot
      key={kind}
      label={kind === 'voltage' ? t('chart.voltage') : t('chart.current')}
      unit={kind === 'voltage' ? 'V' : 'A'}
      color={COLORS[kind]}
      times={times}
      values={wave[kind]}
      width={width}
      x={x}
      timeTicks={last ? timeTicks : null}
      cursor={cursor}
      tau={(kind === 'voltage') === (component.kind === 'capacitor') ? tau : null}
      onMove={onMove}
      onLeave={() => onCursor(null)}
      decimal={decimal}
    />
  )

  return (
    <div className="flex flex-col">
      {plot('voltage', false)}
      {plot('current', true)}
    </div>
  )
}

interface PlotProps {
  label: string
  unit: 'V' | 'A'
  color: string
  times: readonly number[]
  values: readonly number[]
  width: number
  x: (time: number) => number
  /** Marcas do tempo (só no gráfico de baixo; o de cima partilha o mesmo eixo). */
  timeTicks: ReturnType<typeof niceTicks> | null
  cursor: number | null
  tau: number | null
  onMove: (e: PointerEvent<SVGRectElement>) => void
  onLeave: () => void
  decimal: ',' | '.'
}

/** Um gráfico: eixo vertical com marcas, grelha discreta, a curva, valor final, τ e cursor. */
function Plot(props: PlotProps) {
  const { label, unit, color, times, values, width, x, timeTicks, cursor, tau, decimal } = props
  const height = PLOT_HEIGHT + MARGIN.top + (timeTicks ? MARGIN.bottom : 4)
  const ticks = useMemo(() => {
    let lo = Infinity
    let hi = -Infinity
    for (const v of values) {
      if (v < lo) lo = v
      if (v > hi) hi = v
    }
    return niceTicks(lo, hi, 4)
  }, [values])
  const y = (v: number) =>
    MARGIN.top + (1 - (v - ticks.min) / (ticks.max - ticks.min || 1)) * PLOT_HEIGHT
  const path = useMemo(() => {
    const idx = downsample(values, MAX_BUCKETS)
    return svgPath(idx.map((i) => ({ x: x(times[i] ?? 0), y: y(values[i] ?? 0) })))
    // x e y dependem só da largura e das marcas (já nas dependências através de width/ticks).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, times, width, ticks])
  const right = width - MARGIN.right
  const final = values.at(-1) ?? 0
  const k = cursor

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={label}
      data-plot={unit === 'V' ? 'voltage' : 'current'}
      className="block touch-none select-none"
    >
      {/* Grelha horizontal discreta + marcas do eixo vertical (texto em cinzento, não na cor). */}
      {ticks.values.map((v) => (
        <g key={v}>
          <line x1={MARGIN.left} x2={right} y1={y(v)} y2={y(v)} stroke="#334155" strokeWidth={1} />
          <text
            x={MARGIN.left - 6}
            y={y(v)}
            dy="0.32em"
            textAnchor="end"
            className="fill-slate-400 text-[10px] tabular-nums"
          >
            {formatSi(v, unit, 3, decimal)}
          </text>
        </g>
      ))}
      <text x={4} y={MARGIN.top + 10} className="fill-slate-300 text-[11px] font-semibold">
        {unit === 'V' ? 'u(t)' : 'i(t)'}
      </text>

      {/* Eixo do tempo (só no gráfico de baixo). */}
      {timeTicks?.values.map((v, n, all) => (
        <text
          key={v}
          x={x(v)}
          y={MARGIN.top + PLOT_HEIGHT + 15}
          // A última etiqueta encosta à direita (senão "500 ms" fica cortado na borda).
          textAnchor={n === all.length - 1 ? 'end' : 'middle'}
          className="fill-slate-400 text-[10px] tabular-nums"
        >
          {formatSi(v, 's', 3, decimal)}
        </text>
      ))}

      {/* Valor final (tracejado) e τ. */}
      <line
        x1={MARGIN.left}
        x2={right}
        y1={y(final)}
        y2={y(final)}
        stroke="#94a3b8"
        strokeDasharray="4 4"
        strokeWidth={1}
      />
      {tau !== null && (
        <g>
          <line
            x1={x(tau)}
            x2={x(tau)}
            y1={MARGIN.top}
            y2={MARGIN.top + PLOT_HEIGHT}
            stroke="#94a3b8"
            strokeDasharray="2 3"
            strokeWidth={1}
          />
          <text x={x(tau) + 3} y={MARGIN.top + 10} className="fill-slate-400 text-[10px]">
            τ
          </text>
        </g>
      )}

      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />

      {/* Cursor: linha vertical + ponto na curva. */}
      {k !== null && times[k] !== undefined && (
        <g pointerEvents="none">
          <line
            x1={x(times[k] ?? 0)}
            x2={x(times[k] ?? 0)}
            y1={MARGIN.top}
            y2={MARGIN.top + PLOT_HEIGHT}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
          <circle
            cx={x(times[k] ?? 0)}
            cy={y(values[k] ?? 0)}
            r={4}
            fill={color}
            stroke="#1e293b"
            strokeWidth={2}
          />
        </g>
      )}

      {/* Zona de rato/dedo (maior do que a curva): todo o retângulo do gráfico. */}
      <rect
        x={MARGIN.left}
        y={MARGIN.top}
        width={Math.max(0, right - MARGIN.left)}
        height={PLOT_HEIGHT}
        fill="transparent"
        data-testid={`chart-area-${unit === 'V' ? 'voltage' : 'current'}`}
        onPointerMove={props.onMove}
        onPointerDown={props.onMove}
        onPointerLeave={props.onLeave}
      />
    </svg>
  )
}
