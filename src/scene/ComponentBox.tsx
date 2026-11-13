import { Edges } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useState } from 'react'
import type { Component, ComponentKind, TerminalId } from '../core/model'
import { boxSize } from './componentShape'
import { modelToScene, rotateOffset, terminalOffsets } from './coordinates'

/**
 * Um componente na cena, ainda como CAIXA SIMPLES (regra 8: primeiro funcional, depois bonito;
 * os modelos 3D .glb chegam na etapa E7).
 */

/** Cor de cada tipo (as mesmas ideias que nos esquemas: fonte vermelha, LED verde…). */
const COLORS: Record<ComponentKind, string> = {
  'dc-source': '#dc2626',
  ground: '#64748b',
  resistor: '#d6b98c',
  switch: '#3b82f6',
  led: '#22c55e',
  lamp: '#facc15',
}

const SELECTION_COLOR = '#38bdf8'

interface Props {
  component: Component
  selected: boolean
  /** Botão esquerdo em cima do componente: selecionar e começar a arrastar. */
  onGrab: (component: Component, clientX: number, clientY: number) => void
  /** Terminais com pelo menos um fio (ficam verdes; os soltos ficam brancos). */
  connected: ReadonlySet<TerminalId>
  /** Terminal de onde parte o fio que se está a desenhar (ou null). */
  wiringFrom: TerminalId | null
  /** Clique num terminal: começa ou termina um fio. */
  onTerminalClick: (terminal: TerminalId) => void
}

const TERMINAL_COLORS = { loose: '#e2e8f0', connected: '#4ade80', active: '#38bdf8' }

export function ComponentBox({
  component,
  selected,
  onGrab,
  connected,
  wiringFrom,
  onTerminalClick,
}: Props) {
  const { kind, position, rotation } = component
  const [length, height, width] = boxSize(kind)

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return // direito/meio: deslocar a vista
    e.stopPropagation() // só o componente da frente reage
    onGrab(component, e.clientX, e.clientY)
  }

  return (
    <group position={modelToScene(position)}>
      {/* A caixa roda; a rotação do esquema (anti-horária) é uma rotação em torno do eixo Y. */}
      <mesh
        position={[0, height / 2, 0]}
        rotation={[0, (rotation * Math.PI) / 180, 0]}
        onPointerDown={onPointerDown}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'grab'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      >
        <boxGeometry args={[length, height, width]} />
        <meshStandardMaterial
          color={COLORS[kind]}
          emissive={selected ? SELECTION_COLOR : '#000000'}
          emissiveIntensity={selected ? 0.25 : 0}
        />
        {/* Contorno de destaque do componente selecionado. */}
        {selected && <Edges scale={1.12} color={SELECTION_COLOR} />}
      </mesh>

      {/* Terminais: clicar num e depois noutro liga-os com um fio. */}
      {terminalOffsets(kind).map((offset, i) => {
        const terminal = component.terminals[i]
        if (!terminal) return null
        return (
          <TerminalDot
            key={terminal.id}
            id={terminal.id}
            position={modelToScene(rotateOffset(offset, rotation), 0.06)}
            state={
              terminal.id === wiringFrom
                ? 'active'
                : connected.has(terminal.id)
                  ? 'connected'
                  : 'loose'
            }
            onClick={onTerminalClick}
          />
        )
      })}

      {/* O nome (R1, D1…) não é desenhado aqui: fica na camada HTML única do Workspace
          (um `Html` do drei por componente às vezes desaparecia). */}
    </group>
  )
}

interface TerminalDotProps {
  id: TerminalId
  position: [number, number, number]
  state: keyof typeof TERMINAL_COLORS
  onClick: (terminal: TerminalId) => void
}

/** Um terminal: ponto visível pequeno + zona de clique maior (invisível) à volta. */
function TerminalDot({ id, position, state, onClick }: TerminalDotProps) {
  const [hover, setHover] = useState(false)
  const big = hover || state === 'active'

  return (
    <group position={position}>
      <mesh
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.stopPropagation() // não arrasta o componente
          onClick(id)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(true)
          document.body.style.cursor = 'crosshair'
        }}
        onPointerOut={() => {
          setHover(false)
          document.body.style.cursor = ''
        }}
      >
        <sphereGeometry args={[0.3, 12, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh scale={big ? 1.6 : 1}>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshStandardMaterial color={TERMINAL_COLORS[state]} />
      </mesh>
    </group>
  )
}
