import { Grid, Line, MapControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { MOUSE } from 'three'
import type { Component, TerminalId, Vec2 } from '../core/model'
import { useCircuitStore } from '../store/circuitStore'
import { useT } from '../ui/i18n'
import { ComponentBox } from './ComponentBox'
import { labelHeight } from './componentShape'
import { COMPONENT_DRAG_TYPE, isComponentKind, PLACE_COMPONENT_EVENT } from './componentDrag'
import {
  findFreeCell,
  modelToScene,
  orthogonalRoute,
  snapToGrid,
  terminalPosition,
  terminalPositionById,
} from './coordinates'
import { startComponentDrag } from './dragComponent'
import { GroundPicker, type ScreenToModel } from './GroundPicker'
import { AnchorProjector } from './ScreenAnchors'
import { WireView } from './WireView'

/**
 * Zona livre 2.5D.
 *
 * - Câmara ORTOGRÁFICA: os objetos não ficam mais pequenos ao longe, por isso a grelha
 *   e as distâncias continuam "exatas" como num esquema. Está ligeiramente inclinada
 *   para se ver o volume dos componentes (ver docs/decisoes.md, D-006).
 * - O plano do circuito é o plano XZ do Three.js (Y aponta para cima).
 *   Conversão: posição do modelo (x, y) → cena (x, 0, −y) (ver coordinates.ts).
 * - Navegação: roda do rato = zoom; botão direito ou do meio = deslocar (pan).
 *   O botão esquerdo fica livre para selecionar/arrastar componentes.
 * - Criar componentes: arrastar um item do menu e largá-lo aqui (fica no ponto da grelha
 *   mais próximo), ou clicar no item (fica no centro da vista, numa célula livre).
 * - Editar: clique num componente = selecionar (clique no vazio tira a seleção); arrastá-lo
 *   move-o de ponto em ponto da grelha (um arrasto = um só passo de Desfazer).
 * - Fios: clique num terminal e depois noutro → fio ortogonal ("L"). Esc, botão direito ou
 *   clique no vazio cancelam. Clique num fio seleciona-o (Delete apaga).
 */
export function Workspace() {
  const t = useT()
  const components = useCircuitStore((s) => s.components)
  const selectedId = useCircuitStore((s) => s.selectedId)
  const addComponent = useCircuitStore((s) => s.addComponent)
  const select = useCircuitStore((s) => s.select)
  const wires = useCircuitStore((s) => s.wires)
  const selectedWireId = useCircuitStore((s) => s.selectedWireId)
  const selectWire = useCircuitStore((s) => s.selectWire)
  const addWire = useCircuitStore((s) => s.addWire)
  /** Terminal de onde parte o fio que se está a desenhar. */
  const [wiringFrom, setWiringFrom] = useState<TerminalId | null>(null)
  /** Ponto da grelha debaixo do rato, para desenhar o fio "fantasma". */
  const [pointer, setPointer] = useState<Vec2 | null>(null)
  const container = useRef<HTMLDivElement>(null)
  const picker = useRef<ScreenToModel | null>(null)
  const anchorLayer = useRef<HTMLDivElement>(null)

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes(COMPONENT_DRAG_TYPE)) return
    e.preventDefault() // sem isto o browser não deixa largar aqui
    e.dataTransfer.dropEffect = 'copy'
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    const kind = e.dataTransfer.getData(COMPONENT_DRAG_TYPE)
    if (!isComponentKind(kind)) return
    e.preventDefault()
    const point = picker.current?.(e.clientX, e.clientY)
    if (point) addComponent(kind, snapToGrid(point))
  }

  const connected = useMemo(() => new Set(wires.flatMap((w) => [w.from, w.to])), [wires])

  const cancelWiring = () => {
    setWiringFrom(null)
    setPointer(null)
  }

  // 1.º clique num terminal: começa o fio. 2.º clique noutro terminal: cria-o.
  const onTerminalClick = (terminal: TerminalId) => {
    if (wiringFrom === null) {
      setWiringFrom(terminal)
      return
    }
    if (terminal !== wiringFrom) addWire(wiringFrom, terminal)
    cancelWiring()
  }

  // Enquanto se liga um fio: o fantasma segue o rato e Esc cancela (antes do Esc "normal").
  useEffect(() => {
    if (wiringFrom === null) return
    const onMove = (e: PointerEvent) => {
      const point = picker.current?.(e.clientX, e.clientY)
      if (point) setPointer(snapToGrid(point))
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      setWiringFrom(null)
      setPointer(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('keydown', onKey, { capture: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('keydown', onKey, { capture: true })
    }
  }, [wiringFrom])

  const wiringStart = wiringFrom ? terminalPositionById(components, wiringFrom) : null
  const wiringLabel = wiringFrom
    ? `${components.find((c) => wiringFrom.startsWith(`${c.id}:`))?.name ?? '?'}:${wiringFrom.split(':')[1] ?? ''}`
    : ''

  // Botão esquerdo num componente: seleciona-o e começa a arrastá-lo até se largar o botão.
  const onGrab = (component: Component, clientX: number, clientY: number) => {
    if (wiringFrom !== null) cancelWiring()
    select(component.id)
    const grab = picker.current?.(clientX, clientY)
    const drag = grab ? startComponentDrag(component.id, grab) : null
    if (!drag) return
    document.body.style.cursor = 'grabbing'
    const onMove = (e: PointerEvent) => {
      const point = picker.current?.(e.clientX, e.clientY)
      if (point) drag.moveTo(point)
    }
    const onUp = () => {
      drag.end()
      document.body.style.cursor = ''
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  // Clique num item do menu → componente no centro da vista, numa célula livre.
  useEffect(() => {
    const onPlace = (event: Event) => {
      const kind = (event as CustomEvent<unknown>).detail
      if (typeof kind !== 'string' || !isComponentKind(kind)) return
      const rect = container.current?.getBoundingClientRect()
      const center =
        rect && picker.current?.(rect.left + rect.width / 2, rect.top + rect.height / 2)
      const occupied = useCircuitStore.getState().components.map((c) => c.position)
      addComponent(kind, findFreeCell(center ?? { x: 0, y: 0 }, occupied))
    }
    window.addEventListener(PLACE_COMPONENT_EVENT, onPlace)
    return () => window.removeEventListener(PLACE_COMPONENT_EVENT, onPlace)
  }, [addComponent])

  return (
    <div
      ref={container}
      // touch-none: com o dedo, arrastar na cena move o componente em vez de fazer scroll/zoom.
      className="absolute inset-0 touch-none"
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-component-count={components.length}
      data-wire-count={wires.length}
      // Botão direito a meio de um fio → cancela (e não abre o menu do browser).
      onContextMenu={(e) => {
        if (wiringFrom === null) return
        e.preventDefault()
        cancelWiring()
      }}
    >
      <Canvas
        orthographic
        camera={{ position: [0, 20, 12], zoom: 40, near: 0.1, far: 1000 }}
        aria-label={t('workspace.label')}
        // Clique (botão esquerdo) que não acertou em nada → cancela o fio e tira a seleção.
        onPointerMissed={(e) => {
          if (e.button !== 0) return
          if (wiringFrom !== null) cancelWiring()
          select(null)
        }}
      >
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[6, 12, 4]} intensity={1.2} />

        {/* Grelha: 1 célula = 1 unidade; linha mais forte a cada 5 células. */}
        <Grid
          infiniteGrid
          cellSize={1}
          sectionSize={5}
          cellColor="#334155"
          sectionColor="#64748b"
          cellThickness={1}
          sectionThickness={1.4}
          fadeDistance={200}
          fadeStrength={1}
        />

        {wires.map((w) => {
          const a = terminalPositionById(components, w.from)
          const b = terminalPositionById(components, w.to)
          if (!a || !b) return null
          return (
            <WireView
              key={w.id}
              id={w.id}
              points={orthogonalRoute(a, b)}
              selected={w.id === selectedWireId}
              onSelect={selectWire}
            />
          )
        })}

        {/* Fio "fantasma" enquanto se escolhe o 2.º terminal. */}
        {wiringStart && pointer && (
          <Line
            points={orthogonalRoute(wiringStart, pointer).map((p) => modelToScene(p, 0.05))}
            color="#38bdf8"
            lineWidth={2}
            dashed
            dashSize={0.25}
            gapSize={0.15}
          />
        )}

        {components.map((c) => (
          <ComponentBox
            key={c.id}
            component={c}
            selected={c.id === selectedId}
            onGrab={onGrab}
            connected={connected}
            wiringFrom={wiringFrom}
            onTerminalClick={onTerminalClick}
          />
        ))}

        <GroundPicker pickerRef={picker} />
        <AnchorProjector layer={anchorLayer} />

        <MapControls
          makeDefault
          enableRotate={false}
          minZoom={10}
          maxZoom={200}
          mouseButtons={{ MIDDLE: MOUSE.PAN, RIGHT: MOUSE.PAN }}
        />
      </Canvas>

      {/* Camada HTML única por cima da cena (ver ScreenAnchors.tsx): o nome de cada componente
          (visível) e âncoras invisíveis por cima dos terminais e dos fios (para os testes E2E). */}
      <div
        ref={anchorLayer}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      >
        {components.map((c) => (
          <span
            key={`label-${c.id}`}
            data-anchor={modelToScene(c.position, labelHeight(c.kind)).join(',')}
            className="absolute top-0 left-0"
          >
            {/* O ponto projetado é o canto do <span> de fora; este fica centrado nele. */}
            <span
              data-component-label={c.name}
              data-selected={c.id === selectedId}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded px-1 text-xs font-semibold whitespace-nowrap ${
                c.id === selectedId ? 'bg-sky-500 text-white' : 'bg-slate-900/70 text-slate-100'
              }`}
            >
              {c.name}
            </span>
          </span>
        ))}
        {components.flatMap((c) =>
          c.terminals.map((t, i) => (
            <span
              key={t.id}
              data-anchor={modelToScene(terminalPosition(c, i), 0.06).join(',')}
              data-terminal={`${c.name}:${t.name}`}
              data-terminal-state={
                t.id === wiringFrom ? 'active' : connected.has(t.id) ? 'connected' : 'loose'
              }
              className="absolute top-0 left-0 size-1"
            />
          )),
        )}
        {wires.map((w) => {
          const a = terminalPositionById(components, w.from)
          const b = terminalPositionById(components, w.to)
          if (!a || !b) return null
          const [p0, p1] = orthogonalRoute(a, b)
          if (!p0 || !p1) return null
          const middle = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 }
          return (
            <span
              key={w.id}
              data-anchor={modelToScene(middle, 0.05).join(',')}
              data-wire={w.id}
              data-selected={w.id === selectedWireId}
              className="absolute top-0 left-0 size-1"
            />
          )
        })}
      </div>

      {wiringFrom && (
        <p
          role="status"
          className="pointer-events-none absolute top-2 left-2 rounded bg-slate-900/85 px-2 py-1 text-xs text-slate-200"
        >
          {t('workspace.wiringBefore')} <strong>{wiringLabel}</strong> {t('workspace.wiringAfter')}
        </p>
      )}
    </div>
  )
}
