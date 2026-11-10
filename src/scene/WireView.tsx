import type { Vec2 } from '../core/model'
import { modelToScene } from './coordinates'

const WIRE_HEIGHT = 0.05
const WIRE_THICKNESS = 0.1
const COLORS = { normal: '#f59e0b', selected: '#38bdf8' }

interface Props {
  id: string
  /** Pontos do traçado (na grelha), do primeiro ao último terminal. */
  points: readonly Vec2[]
  selected: boolean
  onSelect: (id: string) => void
}

/**
 * Um fio na cena: cada troço (horizontal ou vertical) é uma caixa fina e achatada, que também
 * serve de zona de clique para selecionar o fio.
 */
export function WireView({ id, points, selected, onSelect }: Props) {
  const segments = points.slice(1).map((end, i) => {
    const start = points[i] ?? end
    const length = Math.hypot(end.x - start.x, end.y - start.y)
    const horizontal = start.y === end.y
    const middle = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
    return { middle, length, horizontal }
  })

  return (
    <group>
      {segments.map(({ middle, length, horizontal }, i) => (
        <mesh
          key={i}
          position={modelToScene(middle, WIRE_HEIGHT)}
          onPointerDown={(e) => {
            if (e.button !== 0) return
            e.stopPropagation()
            onSelect(id)
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            document.body.style.cursor = ''
          }}
        >
          {/* + espessura: os troços sobrepõem-se nos cotovelos, sem buracos. */}
          <boxGeometry
            args={
              horizontal
                ? [length + WIRE_THICKNESS, 0.04, WIRE_THICKNESS]
                : [WIRE_THICKNESS, 0.04, length + WIRE_THICKNESS]
            }
          />
          <meshStandardMaterial color={selected ? COLORS.selected : COLORS.normal} />
        </mesh>
      ))}
    </group>
  )
}
