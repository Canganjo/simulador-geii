import { Html } from '@react-three/drei'
import type { Component, ComponentKind } from '../core/model'
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

/** Tamanho da caixa [comprimento, altura, largura] em células. */
function boxSize(kind: ComponentKind): [number, number, number] {
  return kind === 'ground' ? [0.9, 0.25, 0.9] : [1.6, 0.5, 0.7]
}

interface Props {
  component: Component
  selected: boolean
}

export function ComponentBox({ component, selected }: Props) {
  const { kind, position, rotation, name } = component
  const [length, height, width] = boxSize(kind)

  return (
    <group position={modelToScene(position)}>
      {/* A caixa roda; a rotação do esquema (anti-horária) é uma rotação em torno do eixo Y. */}
      <mesh position={[0, height / 2, 0]} rotation={[0, (rotation * Math.PI) / 180, 0]}>
        <boxGeometry args={[length, height, width]} />
        <meshStandardMaterial
          color={COLORS[kind]}
          emissive={selected ? '#38bdf8' : '#000000'}
          emissiveIntensity={selected ? 0.35 : 0}
        />
      </mesh>

      {/* Terminais: pequenos pontos nas pontas (os fios vão ligar-se aqui). */}
      {terminalOffsets(kind).map((offset, i) => (
        <mesh key={i} position={modelToScene(rotateOffset(offset, rotation), 0.06)}>
          <sphereGeometry args={[0.12, 16, 12]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
      ))}

      {/* Nome por cima (HTML: não precisa de descarregar uma fonte 3D). */}
      <Html position={[0, height + 0.3, 0]} center zIndexRange={[10, 0]}>
        <span
          data-component-label={name}
          className={`pointer-events-none rounded px-1 text-xs font-semibold whitespace-nowrap select-none ${
            selected ? 'bg-sky-500 text-white' : 'bg-slate-900/70 text-slate-100'
          }`}
        >
          {name}
        </span>
      </Html>
    </group>
  )
}
