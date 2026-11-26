import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { Matrix4, type InstancedMesh } from 'three'
import type { Component, TerminalId, Vec2, Wire } from '../core/model'
import type { ComponentResult } from '../core/solver'
import {
  buildWireFlowModel,
  chargeSpeed,
  currentLevel,
  isOvercurrent,
  wireCurrentsInto,
  type FlowDirection,
  type WireFlowModel,
} from '../core/wires'
import type { TransientData } from '../store/simulationStore'
import { formatSi } from '../ui/formatSi'
import {
  type ChargePath,
  CHARGE_SPACING,
  chargeCount,
  makeChargePath,
  playbackIndex,
  pointAt,
  wrap,
} from './chargePath'
import type { LiveCurrents } from './liveCurrents'

/** Altura das cargas: um pouco acima do fio (que está a 0,05). */
const CHARGE_HEIGHT = 0.1
const CHARGE_RADIUS = 0.07
/** Cargas positivas (sentido convencional) amarelas; eletrões azuis. */
const CHARGE_COLORS: Record<FlowDirection, string> = {
  conventional: '#fde047',
  electron: '#67e8f9',
}
/** Transitório: a simulação inteira passa em 6 s reais e recomeça. */
export const PLAYBACK_SECONDS = 6
/** Uma imagem que demorou muito (separador escondido) não faz as cargas saltar. */
const MAX_FRAME_TIME = 0.1

/** Textos do valor ao passar o rato (já traduzidos fora, na língua escolhida). */
export interface CurrentTooltipText {
  decimal: ',' | '.'
  /** Ex.: "curto-circuito?" — acrescentado quando a corrente passa o limite. */
  overcurrent: string
  /** Instante do transitório: "t = {time}". */
  time: string
}

interface Props {
  components: Component[]
  wires: Wire[]
  routes: ReadonlyMap<string, Vec2[]>
  /** Resultados DC (ou do último instante do transitório). */
  results: ReadonlyMap<string, ComponentResult>
  /** Curvas do transitório: se existirem, as cargas seguem a corrente de cada instante. */
  transient: TransientData | null
  direction: FlowDirection
  /** Cursor "Velocidade da animação". */
  speed: number
  live: LiveCurrents
  /** Fio debaixo do rato e onde escrever o seu valor (sem re-render do React). */
  hoveredWireId: string | null
  tooltip: RefObject<HTMLSpanElement | null>
  /** Onde escrever o instante mostrado no transitório (t = …). */
  clock: RefObject<HTMLSpanElement | null>
  text: CurrentTooltipText
}

/**
 * Cargas a andar nos fios, com a corrente calculada pelo solver (ver src/core/wires).
 *
 * Desempenho: TODAS as cargas de todos os fios são UM só InstancedMesh (uma chamada de desenho).
 * A cada imagem (useFrame) só se mexe nas matrizes das instâncias, em vetores criados uma vez:
 * nada de objetos novos nem de re-render do React.
 */
export function ChargeFlow({
  components,
  wires,
  routes,
  results,
  transient,
  direction,
  speed,
  live,
  hoveredWireId,
  tooltip,
  clock,
  text,
}: Props) {
  // Matriz "correntes dos componentes → correntes nos fios" (só muda com o circuito).
  const paths = useMemo(() => {
    const map = new Map<string, ChargePath>()
    for (const [id, points] of routes) map.set(id, makeChargePath(points))
    return map
  }, [routes])
  const model = useMemo(
    () =>
      buildWireFlowModel({ components, wires }, { length: (w) => paths.get(w.id)?.length ?? 1 }),
    [components, wires, paths],
  )

  // Onde começam as cargas de cada fio no InstancedMesh.
  const layout = useMemo(() => chargeLayout(model, paths), [model, paths])

  // Nomes legíveis dos terminais para o valor ao passar o rato: "R1:a".
  const terminalNames = useMemo(() => {
    const map = new Map<TerminalId, string>()
    for (const c of components) for (const t of c.terminals) map.set(t.id, `${c.name}:${t.name}`)
    return map
  }, [components])
  const wireById = useMemo(() => new Map(wires.map((w) => [w.id, w])), [wires])

  // Vetores de trabalho, criados uma vez por circuito.
  const work = useMemo(
    () => ({
      phase: new Float64Array(model.wires.length),
      currents: new Float64Array(model.wires.length),
      injection: new Float64Array(model.sources.length),
      point: { x: 0, y: 0 },
      matrix: new Matrix4(),
      hidden: new Matrix4().makeScale(0, 0, 0),
    }),
    [model],
  )

  const mesh = useRef<InstancedMesh>(null)
  useEffect(() => () => live.clear(), [live])

  // Tudo o que a imagem precisa; as mudanças (posições, textos) ficam em stepCharges.
  const frame: FrameInput = {
    model,
    layout,
    work,
    results,
    transient,
    direction,
    speed,
    live,
    hoveredWireId,
    tooltip,
    clock,
    text,
    terminalNames,
    wireById,
    mesh,
  }
  useFrame(({ clock: frameClock }, delta) => stepCharges(frame, frameClock.elapsedTime, delta))

  return (
    <instancedMesh
      // Novo número de cargas → novo InstancedMesh (o tamanho é fixo na criação).
      key={layout.total}
      ref={mesh}
      args={[undefined, undefined, layout.total]}
      // As cargas não apanham o rato (o clique vai para o fio por baixo).
      raycast={() => undefined}
      frustumCulled={false}
    >
      <icosahedronGeometry args={[CHARGE_RADIUS, 0]} />
      <meshBasicMaterial color={CHARGE_COLORS[direction]} toneMapped={false} />
    </instancedMesh>
  )
}

type Layout = ReturnType<typeof chargeLayout>

/** Primeira instância e número de cargas de cada fio (pela ordem de `model.wires`). */
function chargeLayout(model: WireFlowModel, paths: ReadonlyMap<string, ChargePath>) {
  const items: { wireId: string; path: ChargePath; count: number; first: number }[] = []
  let total = 0
  for (const flow of model.wires) {
    const path = paths.get(flow.wireId) ?? makeChargePath([])
    const count = chargeCount(path.length)
    items.push({ wireId: flow.wireId, path, count, first: total })
    total += count
  }
  return { items, total }
}

interface FrameInput {
  model: WireFlowModel
  layout: Layout
  work: {
    phase: Float64Array
    currents: Float64Array
    injection: Float64Array
    point: Vec2
    matrix: Matrix4
    hidden: Matrix4
  }
  results: ReadonlyMap<string, ComponentResult>
  transient: TransientData | null
  direction: FlowDirection
  speed: number
  live: LiveCurrents
  hoveredWireId: string | null
  tooltip: RefObject<HTMLSpanElement | null>
  clock: RefObject<HTMLSpanElement | null>
  text: CurrentTooltipText
  terminalNames: ReadonlyMap<TerminalId, string>
  wireById: ReadonlyMap<string, Wire>
  mesh: RefObject<InstancedMesh | null>
}

/** Uma imagem da animação: correntes deste instante → posições das cargas → textos. */
function stepCharges(f: FrameInput, elapsed: number, delta: number): void {
  const instances = f.mesh.current
  if (!instances) return
  const { work, live, text } = f
  const dt = Math.min(delta, MAX_FRAME_TIME)

  // 1. Corrente em cada fio neste instante.
  const transient = f.transient
  if (transient && transient.times.length > 0) {
    const k = playbackIndex(elapsed, transient.times.length, PLAYBACK_SECONDS)
    wireCurrentsInto(
      f.model,
      (id) => transient.waveforms.get(id)?.current[k],
      work.injection,
      work.currents,
    )
    live.time = transient.times[k] ?? null
  } else {
    wireCurrentsInto(f.model, (id) => f.results.get(id)?.current, work.injection, work.currents)
    live.time = null
  }

  // 2. Cargas de cada fio: andam todas juntas (uma fase por fio), com espaçamento constante.
  f.layout.items.forEach(({ wireId, path, count, first }, i) => {
    const current = work.currents[i] ?? 0
    live.values.set(wireId, current)
    const v = chargeSpeed(current, { direction: f.direction, scale: f.speed })
    const phase = wrap((work.phase[i] ?? 0) + v * dt, CHARGE_SPACING)
    work.phase[i] = phase
    const visible = currentLevel(current) > 0 && path.length > 0
    for (let j = 0; j < count; j++) {
      const s = j * CHARGE_SPACING + phase
      if (!visible || s > path.length) {
        instances.setMatrixAt(first + j, work.hidden)
        continue
      }
      const p = pointAt(path, s, work.point)
      work.matrix.makeTranslation(p.x, CHARGE_HEIGHT, -p.y)
      instances.setMatrixAt(first + j, work.matrix)
    }
  })
  instances.instanceMatrix.needsUpdate = true

  // 3. Textos (escritos direto no HTML, sem re-render).
  const clockEl = f.clock.current
  if (clockEl) {
    clockEl.textContent =
      live.time === null
        ? ''
        : text.time.replace('{time}', formatSi(live.time, 's', 3, text.decimal))
  }
  const tip = f.tooltip.current
  if (tip && f.hoveredWireId) {
    const current = live.values.get(f.hoveredWireId) ?? 0
    const wire = f.wireById.get(f.hoveredWireId)
    // A seta segue o sentido CONVENCIONAL da corrente (do + para o −).
    const [from, to] = current >= 0 ? [wire?.from, wire?.to] : [wire?.to, wire?.from]
    const value = formatSi(Math.abs(current), 'A', 3, text.decimal)
    const arrow =
      currentLevel(current) > 0 && from && to
        ? `  ${f.terminalNames.get(from) ?? from} → ${f.terminalNames.get(to) ?? to}`
        : ''
    const warning = isOvercurrent(current) ? `  ⚠ ${text.overcurrent}` : ''
    tip.textContent = `I = ${value}${arrow}${warning}`
  }
}
