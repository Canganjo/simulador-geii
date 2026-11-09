import { Grid, MapControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useRef, type DragEvent } from 'react'
import { MOUSE } from 'three'
import { useCircuitStore } from '../store/circuitStore'
import { ComponentBox } from './ComponentBox'
import { COMPONENT_DRAG_TYPE, isComponentKind, PLACE_COMPONENT_EVENT } from './componentDrag'
import { findFreeCell, snapToGrid } from './coordinates'
import { GroundPicker, type ScreenToModel } from './GroundPicker'

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
 */
export function Workspace() {
  const components = useCircuitStore((s) => s.components)
  const selectedId = useCircuitStore((s) => s.selectedId)
  const addComponent = useCircuitStore((s) => s.addComponent)
  const container = useRef<HTMLDivElement>(null)
  const picker = useRef<ScreenToModel | null>(null)

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
      className="absolute inset-0"
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-component-count={components.length}
    >
      <Canvas
        orthographic
        camera={{ position: [0, 20, 12], zoom: 40, near: 0.1, far: 1000 }}
        aria-label="Zona livre"
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

        {components.map((c) => (
          <ComponentBox key={c.id} component={c} selected={c.id === selectedId} />
        ))}

        <GroundPicker pickerRef={picker} />

        <MapControls
          makeDefault
          enableRotate={false}
          minZoom={10}
          maxZoom={200}
          mouseButtons={{ MIDDLE: MOUSE.PAN, RIGHT: MOUSE.PAN }}
        />
      </Canvas>
    </div>
  )
}
