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
 * (Ctrl+Z / Ctrl+Y ficam na barra superior.)
 */
export function useEditShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || isTyping(event.target)) return
      const { selectedId, rotateComponent, duplicateComponent, removeComponent, select } =
        useCircuitStore.getState()
      if (selectedId === null) return
      const ctrl = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()

      if (!ctrl && key === 'r') rotateComponent(selectedId)
      // Ctrl+D: o preventDefault no fim evita que o browser crie um "marcador".
      else if (ctrl && key === 'd') duplicateComponent(selectedId)
      else if (!ctrl && (event.key === 'Delete' || event.key === 'Backspace'))
        removeComponent(selectedId)
      else if (event.key === 'Escape') select(null)
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
