import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { MeshStandardMaterial } from 'three'
import type { Vec2 } from '../core/model'
import { currentColor, isOvercurrent } from '../core/wires'
import type { LiveCurrents } from './liveCurrents'
import { modelToScene } from './coordinates'
import { SoftShadow } from './SoftShadow'
import { segmentMiddles, wireCorners, wireEnds } from './wireRoute'

const WIRE_HEIGHT = 0.05
const WIRE_THICKNESS = 0.1
const COLORS = { normal: '#f59e0b', selected: '#38bdf8', alarm: '#dc2626', alarmOff: '#450a0a' }
/** Curto-circuito: o fio pisca 3 vezes por segundo. */
const BLINK_HZ = 3

interface Props {
  id: string
  /** Pontos do traçado (na grelha), do primeiro ao último terminal. */
  points: readonly Vec2[]
  selected: boolean
  /**
   * Botão esquerdo num troço: seleciona o fio e começa a arrastar esse troço
   * (`index` = número do troço, do ponto index ao index+1).
   */
  onGrabSegment: (id: string, index: number, clientX: number, clientY: number) => void
  /** Duplo clique: endireitar o fio (volta ao traçado automático). */
  onStraighten: (id: string) => void
  /**
   * Opção "Mostrar corrente": a cor do fio segue |I| (cinzento → amarelo → vermelho) e, num
   * curto-circuito, o fio pisca a vermelho. `live` traz a corrente de cada imagem.
   */
  live?: LiveCurrents | null
  /** Rato por cima do fio (`segment` = troço) ou saiu (null): mostra o valor da corrente. */
  onHover?: (id: string, segment: number | null) => void
}

/**
 * Um fio na cena: cada troço (horizontal ou vertical) é uma caixa fina e achatada, que também
 * serve de zona de clique. Arrastar um troço desloca-o (como no Tinkercad); com o fio
 * selecionado aparece uma pega (bolinha) no meio de cada troço.
 */
export function WireView({
  id,
  points,
  selected,
  onGrabSegment,
  onStraighten,
  live,
  onHover,
}: Props) {
  const segments = points.slice(1).map((end, i) => {
    const start = points[i] ?? end
    const length = Math.hypot(end.x - start.x, end.y - start.y)
    const horizontal = start.y === end.y
    const middle = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
    return { middle, length, horizontal }
  })
  const color = selected ? COLORS.selected : COLORS.normal
  // Um só material para os troços e as juntas: a cor muda num sítio só, sem re-render.
  const material = useMemo(() => new MeshStandardMaterial({ color: COLORS.normal }), [])
  useEffect(() => () => material.dispose(), [material])
  useFrame(({ clock }) => {
    const current = live?.values.get(id)
    if (current === undefined || selected) {
      material.color.set(color)
      return
    }
    if (isOvercurrent(current)) {
      const on = Math.floor(clock.elapsedTime * BLINK_HZ * 2) % 2 === 0
      material.color.set(on ? COLORS.alarm : COLORS.alarmOff)
      return
    }
    material.color.set(currentColor(current))
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
            onGrabSegment(id, i, e.clientX, e.clientY)
          }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            onStraighten(id)
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            // ↕ num troço horizontal (anda para cima/baixo), ↔ num vertical.
            document.body.style.cursor = horizontal ? 'ns-resize' : 'ew-resize'
            onHover?.(id, i)
          }}
          onPointerOut={() => {
            document.body.style.cursor = ''
            onHover?.(id, null)
          }}
        >
          {/* + espessura: os troços sobrepõem-se nos cotovelos, sem buracos.
              A zona de clique é um pouco mais larga do que o fio (mais fácil de agarrar). */}
          <boxGeometry
            args={
              horizontal
                ? [length + WIRE_THICKNESS, 0.04, WIRE_THICKNESS * 2]
                : [WIRE_THICKNESS * 2, 0.04, length + WIRE_THICKNESS]
            }
          />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          {/* O fio visível (mais fino do que a zona de clique). */}
          <mesh raycast={() => undefined} material={material}>
            <boxGeometry
              args={
                horizontal
                  ? [length + WIRE_THICKNESS, 0.04, WIRE_THICKNESS]
                  : [WIRE_THICKNESS, 0.04, length + WIRE_THICKNESS]
              }
            />
          </mesh>
        </mesh>
      ))}

      {/* Sombra por baixo de cada troço (o fio parece pousado na bancada). */}
      {segments.map(({ middle, length, horizontal }, i) => {
        const [x, , z] = modelToScene(middle)
        const along = length + WIRE_THICKNESS
        return (
          <group key={`s${i}`} position={[x, 0, z + 0.04]}>
            <SoftShadow
              size={horizontal ? [along, WIRE_THICKNESS * 1.6] : [WIRE_THICKNESS * 1.6, along]}
              opacity={0.7}
            />
          </group>
        )
      })}

      {/* Juntas redondas nos cantos (o fio dobra sem "degraus") e nas duas pontas (o fio
          continua a pata do componente sem falha, como no LTspice). */}
      {[...wireEnds(points), ...wireCorners(points)].map((p, i) => (
        <mesh
          key={`j${i}`}
          position={modelToScene(p, WIRE_HEIGHT)}
          raycast={() => undefined}
          material={material}
        >
          <cylinderGeometry args={[WIRE_THICKNESS * 0.62, WIRE_THICKNESS * 0.62, 0.045, 16]} />
        </mesh>
      ))}

      {/* Pegas: só no fio selecionado, no meio de cada troço (só aspeto; o clique é no troço). */}
      {selected &&
        segmentMiddles(points).map((m, i) => (
          <mesh
            key={`h${i}`}
            position={modelToScene(m, WIRE_HEIGHT + 0.04)}
            raycast={() => undefined}
          >
            <sphereGeometry args={[0.13, 16, 12]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive={COLORS.selected}
              emissiveIntensity={0.5}
            />
          </mesh>
        ))}
    </group>
  )
}
