import { useFrame, useThree } from '@react-three/fiber'
import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import { Vector3 } from 'three'
import { cameraTiltDegrees } from './camera'
import {
  BASE_SHEET,
  dragDelta,
  pageDelta,
  rangeOf,
  sheetRange,
  thumb,
  viewRange,
  type Range,
} from './scrollbars'

/** O que se vê da zona livre, em unidades da cena (x: esquerda → direita; z: longe → perto). */
export interface ViewRect {
  x: Range
  z: Range
}

/** Desloca a vista (câmara e alvo juntos, como o "pan" do botão direito). */
export type PanView = (dx: number, dz: number) => void

/** Fator do eixo z: o chão inclinado aparece encolhido por cos(inclinação da câmara). */
const Z_FACTOR = Math.cos((cameraTiltDegrees() * Math.PI) / 180)

/** Os controlos da câmara (MapControls) têm um alvo e um update(); confirma-se antes de usar. */
function hasTarget(c: unknown): c is { target: Vector3; update: () => void } {
  return (
    typeof c === 'object' &&
    c !== null &&
    'target' in c &&
    c.target instanceof Vector3 &&
    'update' in c &&
    typeof c.update === 'function'
  )
}

const changed = (a: Range, b: Range) =>
  Math.abs(a.min - b.min) > 1e-3 || Math.abs(a.max - b.max) > 1e-3

/**
 * Fica DENTRO do <Canvas>: em cada imagem vê o que a câmara mostra e avisa `onView` só quando
 * muda; entrega em `panRef` a função que desloca a vista.
 */
export function ViewTracker({
  onView,
  panRef,
}: {
  onView: (view: ViewRect) => void
  panRef: RefObject<PanView | null>
}) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls)
  const invalidate = useThree((s) => s.invalidate)
  const last = useRef<ViewRect | null>(null)

  useEffect(() => {
    panRef.current = (dx, dz) => {
      camera.position.x += dx
      camera.position.z += dz
      if (hasTarget(controls)) {
        controls.target.x += dx
        controls.target.z += dz
        controls.update()
      }
      invalidate()
    }
    return () => {
      panRef.current = null
    }
  }, [camera, controls, invalidate, panRef])

  useFrame(({ size }) => {
    const target = hasTarget(controls) ? controls.target : new Vector3()
    const view: ViewRect = {
      x: viewRange(target.x, size.width, camera.zoom),
      z: viewRange(target.z, size.height, camera.zoom, Z_FACTOR),
    }
    const before = last.current
    if (before && !changed(before.x, view.x) && !changed(before.z, view.z)) return
    last.current = view
    onView(view)
  })
  return null
}

/** Uma barra (horizontal em baixo ou vertical à direita) da zona livre. */
function Bar({
  axis,
  view,
  sheet,
  pan,
  label,
}: {
  axis: 'x' | 'z'
  view: Range
  sheet: Range
  pan: (delta: number) => void
  label: string
}) {
  const track = useRef<HTMLDivElement>(null)
  const drag = useRef<{ last: number; sheet: Range } | null>(null)
  const horizontal = axis === 'x'
  const { start, size } = thumb(view, sheet)
  const coord = (e: { clientX: number; clientY: number }) => (horizontal ? e.clientX : e.clientY)
  const trackPixels = () => {
    const r = track.current?.getBoundingClientRect()
    return r ? (horizontal ? r.width : r.height) : 0
  }

  // Agarrar o cursor: a vista segue o rato (a folha fica fixa durante o arrasto).
  const onThumbDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { last: coord(e), sheet }
  }
  const onThumbMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const now = coord(e)
    pan(dragDelta(now - d.last, trackPixels(), d.sheet))
    d.last = now
  }
  const onThumbUp = () => {
    drag.current = null
  }

  // Clique na calha, antes ou depois do cursor: anda uma "página" para esse lado.
  const onTrackDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || e.target !== e.currentTarget) return
    const r = e.currentTarget.getBoundingClientRect()
    const at = (coord(e) - (horizontal ? r.left : r.top)) / trackPixels()
    pan(pageDelta(view, sheet, at < start ? -1 : 1))
  }

  // Teclado (com a barra focada): setas = 2 quadrados; Page Up/Down = uma página.
  const onKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const back = horizontal ? 'ArrowLeft' : 'ArrowUp'
    const forward = horizontal ? 'ArrowRight' : 'ArrowDown'
    let delta: number | null = null
    if (e.key === back) delta = -2
    else if (e.key === forward) delta = 2
    else if (e.key === 'PageUp') delta = pageDelta(view, sheet, -1)
    else if (e.key === 'PageDown') delta = pageDelta(view, sheet, 1)
    if (delta === null) return
    e.preventDefault()
    e.stopPropagation()
    pan(delta)
  }

  const value = size >= 1 ? 0 : Math.round((start / (1 - size)) * 100)
  return (
    <div
      ref={track}
      role="scrollbar"
      aria-label={label}
      aria-orientation={horizontal ? 'horizontal' : 'vertical'}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      tabIndex={0}
      data-scrollbar={axis}
      onPointerDown={onTrackDown}
      onKeyDown={onKey}
      className={`absolute z-20 rounded-full bg-slate-900/40 transition-colors hover:bg-slate-900/70 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none ${
        horizontal ? 'right-4 bottom-1 left-1 h-2.5' : 'top-1 right-1 bottom-4 w-2.5'
      }`}
    >
      <div
        data-scrollbar-thumb
        onPointerDown={onThumbDown}
        onPointerMove={onThumbMove}
        onPointerUp={onThumbUp}
        onPointerCancel={onThumbUp}
        style={
          horizontal
            ? { left: `${start * 100}%`, width: `${size * 100}%` }
            : { top: `${start * 100}%`, height: `${size * 100}%` }
        }
        className={`absolute cursor-default rounded-full bg-slate-500/70 hover:bg-slate-400 active:bg-sky-400 ${
          horizontal ? 'inset-y-0 min-w-6' : 'inset-x-0 min-h-6'
        }`}
      />
    </div>
  )
}

/**
 * As duas barras da zona livre. `content` = pontos da cena (x, z) ocupados por componentes;
 * a folha que as barras percorrem cresce para os incluir (ver scrollbars.ts).
 */
export function ViewScrollBars({
  view,
  content,
  panRef,
  labels,
}: {
  view: ViewRect
  content: readonly { x: number; z: number }[]
  panRef: RefObject<PanView | null>
  labels: { horizontal: string; vertical: string }
}) {
  const sheetX = sheetRange(BASE_SHEET.x, rangeOf(content.map((p) => p.x)), view.x)
  const sheetZ = sheetRange(BASE_SHEET.z, rangeOf(content.map((p) => p.z)), view.z)
  return (
    <>
      <Bar
        axis="x"
        view={view.x}
        sheet={sheetX}
        pan={(d) => panRef.current?.(d, 0)}
        label={labels.horizontal}
      />
      <Bar
        axis="z"
        view={view.z}
        sheet={sheetZ}
        pan={(d) => panRef.current?.(0, d)}
        label={labels.vertical}
      />
    </>
  )
}
