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
 * Atalhos de edição dos componentes selecionados:
 *   R → rodar 90° (todos) · Ctrl+D → duplicar (só com um) · Delete / Backspace → apagar TODOS
 *   (um só passo de desfazer) · Escape → tirar a seleção · Ctrl+A → selecionar tudo.
 * Com um FIO selecionado: Delete apaga o fio, Escape tira a seleção.
 * (Ctrl+Z / Ctrl+Y ficam na barra superior.)
 */
export function useEditShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || isTyping(event.target)) return
      const state = useCircuitStore.getState()
      const { selectedId, selectedIds, selectedWireId } = state
      const ctrl = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()
      const isDelete = event.key === 'Delete' || event.key === 'Backspace'

      // Ctrl+A: seleciona todos os componentes (em vez de selecionar o texto da página).
      if (ctrl && key === 'a') {
        state.selectAll()
        event.preventDefault()
        return
      }

      // Fio selecionado: Delete apaga-o, Escape tira a seleção.
      if (selectedWireId !== null) {
        if (!ctrl && isDelete) state.removeWire(selectedWireId)
        else if (event.key === 'Escape') state.selectWire(null)
        else return
        event.preventDefault()
        return
      }

      if (selectedId === null || selectedIds.length === 0) return
      const { rotateComponent, duplicateComponent, removeSelected, select } = state

      if (!ctrl && key === 'r') for (const id of selectedIds) rotateComponent(id)
      // Ctrl+D: o preventDefault no fim evita que o browser crie um "marcador".
      else if (ctrl && key === 'd') {
        if (selectedIds.length === 1) duplicateComponent(selectedId)
      } else if (!ctrl && isDelete) removeSelected()
      else if (event.key === 'Escape') select(null)
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
