import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { PANEL_LIMITS, type ResizablePanel } from '../store/panelSizes'
import { useUiStore } from '../store/uiStore'

/** Quanto muda o tamanho por cada tecla de seta. */
const KEYBOARD_STEP = 16

interface Props {
  panel: ResizablePanel
  /** Texto para leitores de ecrã e dica do rato, ex.: "Redimensionar menu". */
  label: string
  /**
   * Para que lado o painel CRESCE quando se puxa a borda:
   *   'right' → menu à esquerda (puxar para a direita alarga)
   *   'left'  → propriedades à direita (puxar para a esquerda alarga)
   *   'up'    → resultados em baixo (puxar para cima aumenta a altura)
   */
  grows: 'right' | 'left' | 'up'
}

/**
 * Borda que se puxa com o rato para mudar o tamanho de um painel (como no VS Code).
 * Duplo clique → tamanho por defeito. Com o foco (Tab), as setas também funcionam.
 */
export function ResizeHandle({ panel, label, grows }: Props) {
  const size = useUiStore((s) => s.sizes[panel])
  const setPanelSize = useUiStore((s) => s.setPanelSize)
  const resetPanelSize = useUiStore((s) => s.resetPanelSize)
  const drag = useRef<{ start: number; startSize: number } | null>(null)

  const vertical = grows !== 'up' // a barra é vertical para o menu e as propriedades
  const sign = grows === 'right' ? 1 : -1
  // Resultados: no máximo 60 % da altura da janela, para a cena nunca desaparecer.
  const maxOverride = () => (panel === 'results' ? window.innerHeight * 0.6 : undefined)
  const { min, max } = PANEL_LIMITS[panel]
  const resize = (value: number) => setPanelSize(panel, value, maxOverride())

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { start: vertical ? e.clientX : e.clientY, startSize: size }
    // Durante o arrasto: sem animações (o painel segue o rato) e sem selecionar texto.
    document.documentElement.classList.add('is-resizing', vertical ? 'cursor-col' : 'cursor-row')
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const position = vertical ? e.clientX : e.clientY
    resize(drag.current.startSize + sign * (position - drag.current.start))
  }

  const stop = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    drag.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    document.documentElement.classList.remove('is-resizing', 'cursor-col', 'cursor-row')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Seta no sentido em que o painel cresce → maior; no sentido contrário → menor.
    const towards: Record<string, number> = vertical
      ? { ArrowRight: 1, ArrowLeft: -1 }
      : { ArrowDown: 1, ArrowUp: -1 }
    const direction = towards[e.key]
    if (direction !== undefined) resize(size + sign * direction * KEYBOARD_STEP)
    else if (e.key === 'Home') resize(min)
    else if (e.key === 'End') resize(max)
    else if (e.key === 'Enter') resetPanelSize(panel)
    else return
    e.preventDefault()
  }

  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      aria-valuenow={size}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title={`${label} (duplo clique: tamanho por defeito)`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onDoubleClick={() => resetPanelSize(panel)}
      onKeyDown={onKeyDown}
      className={`relative z-10 shrink-0 touch-none bg-transparent transition-colors outline-none select-none hover:bg-sky-500/60 focus-visible:bg-sky-500 ${
        vertical ? '-mx-0.5 w-1 cursor-col-resize' : '-my-0.5 h-1 cursor-row-resize'
      }`}
    />
  )
}
