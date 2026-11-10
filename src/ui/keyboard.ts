import { useEffect } from 'react'
import { useCircuitStore } from '../store/circuitStore'

/** Verdadeiro se o foco está num campo de texto (aí as teclas pertencem ao campo, não ao circuito). */
export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  )
}

/**
 * Atalhos de edição do componente selecionado:
 *   R → rodar 90° · Ctrl+D → duplicar · Delete / Backspace → apagar · Escape → tirar a seleção.
 * Com um FIO selecionado: Delete apaga o fio, Escape tira a seleção.
 * (Ctrl+Z / Ctrl+Y ficam na barra superior.)
 */
export function useEditShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || isTyping(event.target)) return
      const state = useCircuitStore.getState()
      const { selectedId, selectedWireId } = state
      const ctrl = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()
      const isDelete = event.key === 'Delete' || event.key === 'Backspace'

      // Fio selecionado: Delete apaga-o, Escape tira a seleção.
      if (selectedWireId !== null) {
        if (!ctrl && isDelete) state.removeWire(selectedWireId)
        else if (event.key === 'Escape') state.selectWire(null)
        else return
        event.preventDefault()
        return
      }

      if (selectedId === null) return
      const { rotateComponent, duplicateComponent, removeComponent, select } = state

      if (!ctrl && key === 'r') rotateComponent(selectedId)
      // Ctrl+D: o preventDefault no fim evita que o browser crie um "marcador".
      else if (ctrl && key === 'd') duplicateComponent(selectedId)
      else if (!ctrl && isDelete) removeComponent(selectedId)
      else if (event.key === 'Escape') select(null)
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
