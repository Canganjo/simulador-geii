/**
 * Arrastar um componente na zona livre, com snap à grelha e UM SÓ passo de Desfazer.
 *
 * Sem cuidado, cada célula por onde o componente passa seria um passo no histórico (Ctrl+Z
 * teria de ser carregado 10 vezes para desfazer um arrasto). Por isso:
 *   1. ao agarrar: pausa-se o histórico (zundo `pause`);
 *   2. a mexer: o componente segue o rato, sem gravar nada;
 *   3. ao largar: põe-se o componente na posição INICIAL (ainda em pausa), retoma-se o
 *      histórico e move-se para a posição FINAL → fica gravado um único passo.
 */

import type { Vec2 } from '../core/model'
import { useCircuitStore } from '../store/circuitStore'
import { snapToGrid } from './coordinates'

export interface ComponentDrag {
  /** Posição do rato (no chão, em coordenadas do modelo) → move o componente. */
  moveTo: (pointer: Vec2) => void
  /** Larga o componente e grava o passo de Desfazer (se mexeu). */
  end: () => void
}

/**
 * Começa a arrastar `id`, agarrado no ponto `grab` (no chão). Guarda a distância entre o ponto
 * agarrado e o centro do componente, para ele não "saltar" para debaixo do rato.
 */
export function startComponentDrag(id: string, grab: Vec2): ComponentDrag | null {
  const store = useCircuitStore.getState()
  const component = store.components.find((c) => c.id === id)
  if (!component) return null

  const start = { ...component.position }
  const offset = { x: start.x - grab.x, y: start.y - grab.y }
  const history = useCircuitStore.temporal.getState()
  history.pause()

  return {
    moveTo: (pointer) => {
      const next = snapToGrid({ x: pointer.x + offset.x, y: pointer.y + offset.y })
      const current = useCircuitStore.getState().components.find((c) => c.id === id)?.position
      if (current && (current.x !== next.x || current.y !== next.y)) {
        useCircuitStore.getState().moveComponent(id, next)
      }
    },
    end: () => {
      const final = useCircuitStore.getState().components.find((c) => c.id === id)?.position
      const moved = final !== undefined && (final.x !== start.x || final.y !== start.y)
      if (moved) useCircuitStore.getState().moveComponent(id, start) // volta ao início, em pausa
      history.resume()
      if (moved) useCircuitStore.getState().moveComponent(id, final) // um só passo gravado
    },
  }
}
