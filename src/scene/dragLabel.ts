import type { Vec2 } from '../core/model'
import { useCircuitStore } from '../store/circuitStore'

/**
 * Arrastar a ETIQUETA (nome) de um componente, para não tapar fios nem outros componentes.
 * Só muda `labelOffset` (aspeto); o componente e as ligações ficam onde estão.
 * Como no arrasto do componente, o movimento todo fica num só passo do Desfazer.
 */

/** A etiqueta encaixa em quartos de quadrado (fica arrumada, mas com liberdade). */
const LABEL_STEP = 0.25

export function snapLabelOffset(offset: Vec2): Vec2 {
  const snap = (v: number) => Math.round(v / LABEL_STEP) * LABEL_STEP + 0 // + 0: tira o −0
  return { x: snap(offset.x), y: snap(offset.y) }
}

export interface LabelDrag {
  /** Posição do rato (no chão, em coordenadas do modelo) → move a etiqueta. */
  moveTo: (pointer: Vec2) => void
  /** Larga a etiqueta e grava o passo de Desfazer (se mexeu). */
  end: () => void
}

/** Começa a arrastar a etiqueta do componente `id`, agarrada no ponto `grab` (no chão). */
export function startLabelDrag(id: string, grab: Vec2): LabelDrag | null {
  const component = useCircuitStore.getState().components.find((c) => c.id === id)
  if (!component) return null
  const start = component.labelOffset ?? { x: 0, y: 0 }
  const history = useCircuitStore.temporal.getState()
  history.pause()
  const current = () =>
    useCircuitStore.getState().components.find((c) => c.id === id)?.labelOffset ?? { x: 0, y: 0 }

  return {
    moveTo: (pointer) => {
      const next = snapLabelOffset({
        x: start.x + pointer.x - grab.x,
        y: start.y + pointer.y - grab.y,
      })
      const now = current()
      if (now.x !== next.x || now.y !== next.y) useCircuitStore.getState().moveLabel(id, next)
    },
    end: () => {
      const final = current()
      const moved = final.x !== start.x || final.y !== start.y
      if (moved) useCircuitStore.getState().moveLabel(id, start) // volta ao início, em pausa
      history.resume()
      if (moved) useCircuitStore.getState().moveLabel(id, final) // um só passo gravado
    },
  }
}
