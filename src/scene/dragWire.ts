/**
 * Arrastar um TROÇO de um fio (como no Tinkercad): o troço anda na perpendicular, de ponto em
 * ponto da grelha, e o fio guarda os cantos novos. Um arrasto = UM só passo de Desfazer
 * (a mesma técnica do dragComponent.ts: pausar o histórico e gravar só no fim).
 */

import type { Vec2 } from '../core/model'
import { useCircuitStore } from '../store/circuitStore'
import { terminalPositionById } from './coordinates'
import { isHorizontal, moveSegment, waypointsOf, wireRoute } from './wireRoute'

export interface WireDrag {
  /** Posição do rato (no chão, em coordenadas do modelo) → desloca o troço. */
  moveTo: (pointer: Vec2) => void
  /** Larga o troço e grava o passo de Desfazer (se mexeu). */
  end: () => void
}

/** Traçado atual de um fio (com os cantos guardados), ou null se faltar um terminal. */
export function currentRoute(wireId: string): Vec2[] | null {
  const { components, wires } = useCircuitStore.getState()
  const wire = wires.find((w) => w.id === wireId)
  if (!wire) return null
  const a = terminalPositionById(components, wire.from)
  const b = terminalPositionById(components, wire.to)
  if (!a || !b) return null
  return wireRoute(a, b, wire.waypoints)
}

const key = (points: readonly Vec2[]) => points.map((p) => `${p.x},${p.y}`).join(' ')

/** Começa a arrastar o troço `index` do fio, agarrado no ponto `grab` (no chão). */
export function startWireDrag(wireId: string, index: number, grab: Vec2): WireDrag | null {
  const route = currentRoute(wireId)
  if (!route || index < 0 || index >= route.length - 1) return null
  const wire = useCircuitStore.getState().wires.find((w) => w.id === wireId)
  const initial = wire?.waypoints ?? []
  const horizontal = isHorizontal(route, index)
  const history = useCircuitStore.temporal.getState()
  history.pause()
  let last = key(initial)

  const put = (waypoints: readonly Vec2[]) =>
    useCircuitStore.getState().setWireWaypoints(wireId, waypoints)

  return {
    moveTo: (pointer) => {
      // Só conta o movimento na perpendicular do troço, arredondado a células inteiras.
      const amount = Math.round(horizontal ? pointer.y - grab.y : pointer.x - grab.x)
      const next = amount === 0 ? [...initial] : waypointsOf(moveSegment(route, index, amount))
      if (key(next) === last) return
      last = key(next)
      put(next)
    },
    end: () => {
      const final = useCircuitStore.getState().wires.find((w) => w.id === wireId)?.waypoints ?? []
      const moved = key(final) !== key(initial)
      if (moved) put(initial) // volta ao início, em pausa
      history.resume()
      if (moved) put(final) // um só passo gravado
    },
  }
}
