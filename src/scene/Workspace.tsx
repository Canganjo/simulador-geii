import { Grid, Line, MapControls } from '@react-three/drei'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { MOUSE } from 'three'
import type { Component, TerminalId, Vec2 } from '../core/model'
import { useCircuitStore } from '../store/circuitStore'
import { useT } from '../ui/i18n'
import { SourceStepper } from '../ui/SourceStepper'
import { ComponentBox } from './ComponentBox'
import { labelHeight } from './componentShape'
import { NO_VISUAL, visualState } from './visualState'
import { nodeLabels } from './nodeLabels'
import { useUiStore } from '../store/uiStore'
import { useSimulationStore } from '../store/simulationStore'
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
import { startWireDrag } from './dragWire'
import { GroundPicker, type ModelToScreen, type ScreenToModel } from './GroundPicker'
import {
  idsInsideRect,
  isDrag,
  rectFromCorners,
  type ScreenPoint,
  type ScreenRect,
} from './selectionBox'
import { CAMERA_POSITION, CAMERA_ZOOM } from './camera'
import { AnchorProjector } from './ScreenAnchors'
import { WireView } from './WireView'
import { segmentMiddles, wireRoute } from './wireRoute'

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
 * - Vários de uma vez: Ctrl (ou Shift) + clique junta/tira; arrastar no VAZIO com o botão
 *   esquerdo (ou tocar duas vezes no touchpad e arrastar) desenha um retângulo que seleciona
 *   os componentes lá dentro. Delete apaga todos (ver keyboard.ts).
 * - Fios: clique num terminal e depois noutro → fio ortogonal ("L"). Esc, botão direito ou
 *   clique no vazio cancelam. Clique num fio seleciona-o (Delete apaga). Arrastar um troço do
 *   fio desloca-o na perpendicular (organizar as linhas, como no Tinkercad); duplo clique
 *   endireita o fio.
 */
export function Workspace() {
  const t = useT()
  const components = useCircuitStore((s) => s.components)
  const selectedIds = useCircuitStore((s) => s.selectedIds)
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  // Depois de Simular: LED/lâmpada acendem, componentes com problemas ficam com contorno.
  const simulation = useSimulationStore((s) => s.result)
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
  const projector = useRef<ModelToScreen | null>(null)
  /** Retângulo de seleção a ser desenhado (px, relativo à zona livre), ou null. */
  const [box, setBox] = useState<ScreenRect | null>(null)
  const anchorLayer = useRef<HTMLDivElement>(null)
  /** Camada dos botões − / + em cima da fonte selecionada (esta apanha o rato). */
  const controlLayer = useRef<HTMLDivElement>(null)

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
  // Opção de debug "Nós" (E3): número do nó elétrico de cada terminal, calculado pelo core.
  const showNodes = useUiStore((s) => s.showNodes)
  const nodes = useMemo(
    () => (showNodes ? nodeLabels({ components, wires }) : null),
    [showNodes, components, wires],
  )
  const visuals = useMemo(
    () => new Map(components.map((c) => [c.id, visualState(c, simulation)])),
    [components, simulation],
  )

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
  const onGrab = (component: Component, clientX: number, clientY: number, additive: boolean) => {
    if (wiringFrom !== null) cancelWiring()
    // Ctrl/Shift + clique: junta ou tira da seleção, sem arrastar.
    if (additive) {
      useCircuitStore.getState().toggleSelect(component.id)
      return
    }
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

  // Botão esquerdo num troço de fio: seleciona o fio e arrasta esse troço até se largar o botão.
  const onGrabSegment = (wireId: string, index: number, clientX: number, clientY: number) => {
    if (wiringFrom !== null) cancelWiring()
    selectWire(wireId)
    const grab = picker.current?.(clientX, clientY)
    const drag = grab ? startWireDrag(wireId, index, grab) : null
    if (!drag) return
    const onMove = (e: PointerEvent) => {
      const point = picker.current?.(e.clientX, e.clientY)
      if (point) drag.moveTo(point)
    }
    const onUp = () => {
      drag.end()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const onStraighten = (wireId: string) => useCircuitStore.getState().setWireWaypoints(wireId, [])

  // Traçado de cada fio (com os cantos guardados), usado na cena e nas âncoras.
  const routes = useMemo(() => {
    const map = new Map<string, Vec2[]>()
    for (const w of wires) {
      const a = terminalPositionById(components, w.from)
      const b = terminalPositionById(components, w.to)
      if (a && b) map.set(w.id, wireRoute(a, b, w.waypoints))
    }
    return map
  }, [components, wires])

  // Botão esquerdo no VAZIO (o "chão" invisível): clique = tirar a seleção;
  // arrasto = retângulo de seleção. Com o dedo (ecrã tátil) só o toque conta: arrastar desloca a vista.
  const onGroundDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const additive = e.ctrlKey || e.shiftKey || e.metaKey
    const start: ScreenPoint = { x: e.clientX, y: e.clientY }
    const touch = e.pointerType === 'touch'
    let dragging = false

    const onMove = (ev: PointerEvent) => {
      if (touch) return
      const now = { x: ev.clientX, y: ev.clientY }
      if (!dragging && !isDrag(start, now)) return
      dragging = true
      const r = rectFromCorners(start, now)
      const origin = container.current?.getBoundingClientRect()
      setBox({ ...r, left: r.left - (origin?.left ?? 0), top: r.top - (origin?.top ?? 0) })
    }
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      setBox(null)
      const end = { x: ev.clientX, y: ev.clientY }
      if (!dragging || ev.type === 'pointercancel') {
        // Um clique no vazio (sem arrastar): cancela o fio e tira a seleção.
        if (!touch && isDrag(start, end)) return
        if (wiringFrom !== null) cancelWiring()
        if (!additive) select(null)
        return
      }
      const toScreen = projector.current
      if (!toScreen) return
      const ids = idsInsideRect(
        useCircuitStore.getState().components,
        rectFromCorners(start, end),
        toScreen,
      )
      useCircuitStore.getState().selectMany(ids, additive)
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
        // Câmara inclinada (~55°) (vê-se o lado dos componentes, como numa bancada) e já perto:
        // ao abrir, os componentes aparecem num bom tamanho sem ser preciso dar zoom.
        camera={{ position: CAMERA_POSITION, zoom: CAMERA_ZOOM, near: 0.1, far: 1000 }}
        aria-label={t('workspace.label')}
        // Clique (botão esquerdo) que não acertou em nada → cancela o fio e tira a seleção.
        onPointerMissed={(e) => {
          if (e.button !== 0) return
          if (wiringFrom !== null) cancelWiring()
          select(null)
        }}
      >
        <color attach="background" args={['#1a1f27']} />
        {/* Luz de "sala": céu claro por cima, chão escuro; mais uma luz forte de frente-cima. */}
        <hemisphereLight args={['#f1f5f9', '#1e293b', 0.9]} />
        <directionalLight position={[4, 10, 8]} intensity={1.6} />
        <directionalLight position={[-6, 6, -4]} intensity={0.35} />

        {/* Grelha: 1 célula = 1 unidade; linha mais forte a cada 5 células. */}
        <Grid
          infiniteGrid
          cellSize={1}
          sectionSize={5}
          cellColor="#353d49"
          sectionColor="#566070"
          cellThickness={1}
          sectionThickness={1.4}
          fadeDistance={200}
          fadeStrength={1}
        />

        {/* "Chão" invisível e enorme por baixo de tudo: recebe o botão esquerdo no vazio
            (clique → tirar a seleção; arrasto → retângulo de seleção). */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} onPointerDown={onGroundDown}>
          <planeGeometry args={[100000, 100000]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {wires.map((w) => {
          const points = routes.get(w.id)
          if (!points) return null
          return (
            <WireView
              key={w.id}
              id={w.id}
              points={points}
              selected={w.id === selectedWireId}
              onGrabSegment={onGrabSegment}
              onStraighten={onStraighten}
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
            selected={selectedSet.has(c.id)}
            onGrab={onGrab}
            connected={connected}
            wiringFrom={wiringFrom}
            onTerminalClick={onTerminalClick}
            visual={visuals.get(c.id) ?? NO_VISUAL}
          />
        ))}

        <GroundPicker pickerRef={picker} projectorRef={projector} />
        <AnchorProjector layer={anchorLayer} />
        <AnchorProjector layer={controlLayer} />

        <MapControls
          makeDefault
          enableRotate={false}
          minZoom={10}
          maxZoom={200}
          mouseButtons={{ MIDDLE: MOUSE.PAN, RIGHT: MOUSE.PAN }}
        />
      </Canvas>

      {/* Camada HTML única por cima da cena (ver ScreenAnchors.tsx): o nome de cada componente
          (visível), âncoras por cima dos terminais (com o número do nó, se a opção "Nós" estiver
          ligada) e por cima dos fios (para os testes E2E). */}
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
              data-selected={selectedSet.has(c.id)}
              // Para os testes E2E: brilho (0 a 1) e problema depois de Simular.
              data-glow={(visuals.get(c.id)?.glow ?? 0).toFixed(2)}
              data-issue={visuals.get(c.id)?.issue ?? 'none'}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded px-1 text-xs font-semibold whitespace-nowrap ${
                selectedSet.has(c.id) ? 'bg-sky-500 text-white' : 'bg-slate-900/70 text-slate-100'
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
              data-node={nodes?.get(t.id)}
              className="absolute top-0 left-0 size-1"
            >
              {nodes && (
                <span
                  className={`absolute bottom-1 left-1 rounded px-1 font-mono text-[10px] leading-4 font-bold whitespace-nowrap ${
                    nodes.get(t.id) === '0'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-300 text-slate-900'
                  }`}
                >
                  {nodes.get(t.id)}
                </span>
              )}
            </span>
          )),
        )}
        {wires.flatMap((w) => {
          const points = routes.get(w.id)
          if (!points) return []
          // Uma âncora no meio de cada troço (a 1.ª tem data-wire: é a que os testes clicam).
          return segmentMiddles(points).map((middle, i) => (
            <span
              key={`${w.id}:${i}`}
              data-anchor={modelToScene(middle, 0.05).join(',')}
              data-wire={i === 0 ? w.id : undefined}
              data-wire-segment={`${w.id}:${i}`}
              data-selected={w.id === selectedWireId}
              data-points={points.map((p) => `${p.x},${p.y}`).join(' ')}
              className="absolute top-0 left-0 size-1"
            />
          ))
        })}
      </div>

      {/* Botões − / + da tensão por cima da fonte DC selecionada (como o botão de regulação de
          uma fonte de bancada). Ficam à frente da fonte: em baixo se está deitada, à direita
          se está de pé (rodada 90°/270°), para não taparem os terminais. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" ref={controlLayer}>
        {components
          .filter(
            (c) => c.kind === 'dc-source' && selectedIds.length === 1 && selectedSet.has(c.id),
          )
          .map((c) => {
            const upright = c.rotation === 90 || c.rotation === 270
            const at = upright
              ? { x: c.position.x + 0.95, y: c.position.y }
              : { x: c.position.x, y: c.position.y - 0.8 }
            return (
              <span
                key={`stepper-${c.id}`}
                data-anchor={modelToScene(at, 0.05).join(',')}
                className="absolute top-0 left-0"
              >
                <span className="absolute -translate-x-1/2 -translate-y-1/2">
                  <SourceStepper componentId={c.id} variant="scene" />
                </span>
              </span>
            )
          })}
      </div>

      {box && (
        <div
          data-testid="selection-box"
          className="pointer-events-none absolute rounded-sm border border-sky-400 bg-sky-400/15"
          style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
        />
      )}

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
