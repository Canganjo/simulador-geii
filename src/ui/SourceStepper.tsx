import {
  useEffect,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Minus, Plus } from 'lucide-react'
import { CATALOG } from '../core/library'
import { useCircuitStore } from '../store/circuitStore'
import { useT } from './i18n'
import { REPEAT_DELAY, REPEAT_INTERVAL, stepVoltage } from './sourceStep'

/**
 * Botões − / + da tensão de uma fonte DC (painel de propriedades e em cima da fonte, na cena).
 *
 * Funcionam antes e durante a simulação: depois de Simular, cada passo recalcula sozinho
 * (simulationStore). Manter carregado repete; tudo o que muda enquanto o botão está carregado
 * conta como UM passo do desfazer (como arrastar um componente).
 */

const VOLTAGE_SPEC = CATALOG['dc-source'].params.voltage
/** Limites da tensão no catálogo (0 V a 1000 V). */
const LIMITS =
  VOLTAGE_SPEC.type === 'number'
    ? { min: VOLTAGE_SPEC.min, max: VOLTAGE_SPEC.max }
    : { min: 0, max: Infinity }

function voltageOf(id: string): number | undefined {
  const c = useCircuitStore.getState().components.find((x) => x.id === id)
  return c?.kind === 'dc-source' ? c.params.voltage : undefined
}

function setVoltage(id: string, voltage: number) {
  useCircuitStore.getState().updateParams(id, { voltage })
}

/** Um passo (teclado, ou o 1.º de um clique do rato). */
function stepOnce(id: string, direction: 1 | -1, big: boolean) {
  const v = voltageOf(id)
  if (v === undefined) return
  const next = stepVoltage(v, direction, big, LIMITS)
  if (next !== v) setVoltage(id, next)
}

/** Começa a carregar num botão: um passo já, depois repete até `stop()`. */
function startHold(id: string, direction: 1 | -1, big: boolean): () => void {
  const start = voltageOf(id)
  const history = useCircuitStore.temporal.getState()
  history.pause()
  stepOnce(id, direction, big)
  let timer = window.setTimeout(function repeat() {
    stepOnce(id, direction, big)
    timer = window.setTimeout(repeat, REPEAT_INTERVAL)
  }, REPEAT_DELAY)

  return () => {
    window.clearTimeout(timer)
    const final = voltageOf(id)
    const changed = start !== undefined && final !== undefined && final !== start
    if (changed) setVoltage(id, start) // volta ao início, ainda em pausa…
    history.resume()
    if (changed) setVoltage(id, final) // …e grava um só passo
  }
}

/** O botão que está carregado agora (só há um rato: um de cada vez). */
let activeHold: (() => void) | null = null

function endHold() {
  activeHold?.()
  activeHold = null
}

interface Props {
  componentId: string
  /** 'panel' = botões do tamanho dos campos; 'scene' = botões pequenos em cima da fonte. */
  variant: 'panel' | 'scene'
}

export function SourceStepper({ componentId, variant }: Props) {
  const t = useT()
  // Se o componente desaparecer (ou o painel fechar) com o botão carregado.
  useEffect(() => endHold, [])

  const button =
    variant === 'panel'
      ? 'flex size-8 shrink-0 items-center justify-center rounded border border-slate-600 bg-slate-900 text-slate-100 hover:border-sky-400 hover:bg-slate-700 active:bg-sky-600'
      : 'pointer-events-auto flex size-6 items-center justify-center rounded-full border border-slate-500 bg-slate-900/90 text-slate-100 shadow shadow-black/40 hover:border-sky-400 hover:bg-slate-700 active:bg-sky-600'
  const icon = variant === 'panel' ? 'size-4' : 'size-3.5'

  const handlers = (direction: 1 | -1) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return
      e.preventDefault() // não tira o foco do campo nem começa uma seleção na cena
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      endHold()
      activeHold = startHold(componentId, direction, e.shiftKey)
    },
    onPointerUp: endHold,
    onPointerCancel: endHold,
    onLostPointerCapture: endHold,
    // Teclado (Enter / Espaço): um passo por tecla. O clique do rato já foi tratado acima.
    onClick: (e: ReactMouseEvent<HTMLButtonElement>) => {
      if (e.detail === 0) stepOnce(componentId, direction, e.shiftKey)
    },
  })

  return (
    <div className="flex gap-1" data-source-stepper={variant}>
      <button
        type="button"
        aria-label={t('source.decrease')}
        title={t('source.decrease')}
        data-step="down"
        className={button}
        {...handlers(-1)}
      >
        <Minus className={icon} aria-hidden />
      </button>
      <button
        type="button"
        aria-label={t('source.increase')}
        title={t('source.increase')}
        data-step="up"
        className={button}
        {...handlers(1)}
      >
        <Plus className={icon} aria-hidden />
      </button>
    </div>
  )
}
