import { Edges, useGLTF } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { MeshStandardMaterial } from 'three'
import type { Component, ComponentKind, TerminalId } from '../core/model'
import { boxSize, shadowSize } from './componentShape'
import { terminalHit } from './terminalPick'
import { ComponentModel, ModelErrorBoundary } from './ComponentModel'
import { Halo } from './Halo'
import { meterDisplay } from './meterDisplay'
import { SoftShadow } from './SoftShadow'
import { modelUrl, modelUrlFor, STATE_MODEL_FILES } from './models3d'
import { modelToScene, rotateOffset, terminalOffsets } from './coordinates'
import { LED_LIGHT, type VisualState } from './visualState'
import { terminalHighlight, terminalMark, type TerminalMark } from './terminalMarks'

/**
 * Um componente na cena: CAIXA SIMPLES, ou o modelo 3D (.glb) do Blender se existir
 * (ver models3d.ts). A caixa fica sempre lá para receber os cliques; com modelo fica invisível.
 */

/** Cor de cada tipo (as mesmas ideias que nos esquemas: fonte vermelha, LED verde…). */
const COLORS: Record<ComponentKind, string> = {
  'dc-source': '#dc2626',
  ground: '#64748b',
  resistor: '#d6b98c',
  switch: '#3b82f6',
  led: '#22c55e',
  lamp: '#facc15',
  diode: '#a855f7', // violeta: distingue-se do LED e vê-se bem no fundo escuro
  capacitor: '#0ea5e9', // azul-claro (condensador eletrolítico)
  inductor: '#b45309', // cor de cobre (fio enrolado)
  voltmeter: '#facc15', // multímetro amarelo
  ammeter: '#facc15',
}

const SELECTION_COLOR = '#38bdf8'
/** Contorno de um componente com problema depois de Simular. */
const ISSUE_COLORS = { error: '#ef4444', warning: '#f59e0b' }
/** Força máxima da luz emitida (glow = 1). */
const MAX_GLOW = 1.6

/** Cor da caixa: o LED tem a cor da sua luz (só brilha quando aceso); os outros, a do tipo. */
function bodyColor(component: Component): string {
  if (component.kind === 'led') return LED_LIGHT[component.params.color] ?? COLORS.led
  return COLORS[component.kind]
}

/**
 * Texto do visor do modelo 3D da fonte DC, como numa fonte de bancada: antes de Simular, a
 * tensão regulada ("12.0 V"); depois, a tensão de saída medida e o modo ("4.70 V" + "CC").
 */
function displayText(component: Component, visual: VisualState): string | undefined {
  // Instrumentos: a leitura depois de Simular ("8.00 V", "4.00 mA"); antes, traços.
  if (component.kind === 'voltmeter') return meterDisplay('V', visual.reading)
  if (component.kind === 'ammeter') return meterDisplay('A', visual.reading)
  if (component.kind !== 'dc-source') return undefined
  const voltage = visual.source?.voltage ?? component.params.voltage
  // 3 algarismos significativos: 4.70 V, 12.0 V, 230 V.
  const size = Math.abs(voltage)
  return `${voltage.toFixed(size >= 100 ? 0 : size >= 10 ? 1 : 2)} V`
}

/** Onde fica a auréola (altura do centro da luz no modelo) e o seu tamanho máximo. */
const HALO: Partial<Record<ComponentKind, { height: number; size: number }>> = {
  led: { height: 0.62, size: 1.3 },
  lamp: { height: 0.56, size: 2.2 },
}

interface Props {
  component: Component
  selected: boolean
  /**
   * Botão esquerdo em cima do componente: selecionar e começar a arrastar.
   * `additive` = Ctrl/Shift/⌘ carregado: junta/tira o componente da seleção (sem arrastar).
   */
  onGrab: (component: Component, clientX: number, clientY: number, additive: boolean) => void
  /** Número de fios em cada terminal (0 = quadrado aberto, 2+ = ponto de junção). */
  wireCounts: ReadonlyMap<TerminalId, number>
  /** Terminal de onde parte o fio que se está a desenhar (ou null). */
  wiringFrom: TerminalId | null
  /** Clique num terminal: começa ou termina um fio. */
  onTerminalClick: (terminal: TerminalId) => void
  /** Aspeto depois de Simular: brilho, contorno de erro/aviso, piscar (ver visualState.ts). */
  visual: VisualState
}

export function ComponentBox({
  component,
  selected,
  onGrab,
  wireCounts,
  wiringFrom,
  onTerminalClick,
  visual,
}: Props) {
  const { kind, position, rotation } = component
  const [length, height, width] = boxSize(kind)
  const material = useRef<MeshStandardMaterial>(null)
  const [failed, setFailed] = useState(false)
  const [modelReady, setModelReady] = useState(false)
  const onModelError = useCallback(() => setFailed(true), [])
  const url = failed ? null : modelUrlFor(component, import.meta.env.BASE_URL)
  const boxVisible = url === null || !modelReady

  // Interruptor: carrega já os dois modelos (aberto e fechado), para o clique trocar sem piscar.
  useEffect(() => {
    if (kind !== 'switch') return
    const base = import.meta.env.BASE_URL
    for (const u of [modelUrl(kind, base), modelUrl(kind, base, STATE_MODEL_FILES)]) {
      if (u) useGLTF.preload(u)
    }
  }, [kind])

  // Luz própria: o brilho da simulação (LED/lâmpada) tem prioridade sobre o da seleção.
  const lit = visual.glow > 0 && visual.glowColor !== null
  const emissive = lit ? visual.glowColor : selected ? SELECTION_COLOR : '#000000'
  const intensity = lit ? visual.glow * MAX_GLOW : selected ? 0.25 : 0
  // LED em sobrecorrente: a luz pisca (2 vezes por segundo).
  useFrame(({ clock }) => {
    if (!visual.blink || !material.current) return
    const on = Math.floor(clock.elapsedTime * 4) % 2 === 0
    material.current.emissiveIntensity = on ? intensity : 0.1
  })

  const outline = selected
    ? SELECTION_COLOR
    : visual.issue !== null
      ? ISSUE_COLORS[visual.issue]
      : null

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return // direito/meio: deslocar a vista
    // Pino escondido atrás do corpo (componente na vertical): o clique passa para o pino.
    if (terminalHit(e.intersections) !== null) return
    e.stopPropagation() // só o componente da frente reage
    onGrab(component, e.clientX, e.clientY, e.ctrlKey || e.shiftKey || e.metaKey)
  }

  return (
    <group position={modelToScene(position)}>
      {/* A caixa roda; a rotação do esquema (anti-horária) é uma rotação em torno do eixo Y. */}
      <mesh
        position={[0, height / 2, 0]}
        rotation={[0, (rotation * Math.PI) / 180, 0]}
        onPointerDown={onPointerDown}
        onPointerOver={(e) => {
          if (terminalHit(e.intersections) !== null) return // o pino de trás fica com o realce
          e.stopPropagation()
          document.body.style.cursor = 'grab'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      >
        <boxGeometry args={[length, height, width]} />
        <meshStandardMaterial
          ref={material}
          color={bodyColor(component)}
          emissive={emissive ?? '#000000'}
          emissiveIntensity={intensity}
          // Com modelo 3D a caixa deixa de ser desenhada, mas continua a receber os cliques
          // (o raycast do three.js não olha para material.visible). Mudar `transparent`/`opacity`
          // depois do 1.º desenho não chegava: o three.js não recompila o material sozinho.
          visible={boxVisible}
        />
        {/* Contorno: azul se selecionado; senão vermelho (erro) ou âmbar (aviso) após Simular. */}
        {outline && <Edges scale={1.12} color={outline} />}
      </mesh>

      {/* Sombra suave no chão (relevo); roda com o componente, um pouco para trás da luz. */}
      <group rotation={[0, (rotation * Math.PI) / 180, 0]}>
        <SoftShadow size={shadowSize(kind)} offset={[0, -0.08]} opacity={selected ? 0.9 : 0.8} />
      </group>

      {/* Modelo 3D (só aspeto): mesma rotação da caixa, assente no chão (y = 0). */}
      {url !== null && (
        <group rotation={[0, (rotation * Math.PI) / 180, 0]}>
          <ModelErrorBoundary onError={onModelError}>
            <Suspense fallback={null}>
              <ComponentModel
                url={url}
                color={bodyColor(component)}
                emissive={emissive ?? '#000000'}
                intensity={intensity}
                blink={visual.blink}
                display={displayText(component, visual)}
                displayTag={visual.source?.mode === 'cc' ? 'CC' : visual.source ? 'CV' : undefined}
                onReady={setModelReady}
              />
            </Suspense>
          </ModelErrorBoundary>
        </group>
      )}

      {/* Auréola de luz por cima do LED / da lâmpada acesos. */}
      {lit && visual.glowColor !== null && HALO[kind] && (
        <Halo
          color={visual.glowColor}
          strength={visual.glow}
          height={HALO[kind].height}
          size={HALO[kind].size}
        />
      )}

      {/* Terminais: clicar num e depois noutro liga-os com um fio. */}
      {terminalOffsets(kind).map((offset, i) => {
        const terminal = component.terminals[i]
        if (!terminal) return null
        return (
          <TerminalDot
            key={terminal.id}
            id={terminal.id}
            position={modelToScene(rotateOffset(offset, rotation), 0.06)}
            mark={terminalMark(wireCounts.get(terminal.id) ?? 0)}
            wiringFrom={wiringFrom}
            onClick={onTerminalClick}
          />
        )
      })}

      {/* O nome (R1, D1…) não é desenhado aqui: fica na camada HTML única do Workspace
          (um `Html` do drei por componente às vezes desaparecia). */}
    </group>
  )
}

/** Cores dos pinos (as do fio: âmbar; realce: azul da seleção). */
const PIN_COLORS = {
  open: '#e2e8f0',
  junction: '#f59e0b',
  hover: '#7dd3fc',
  origin: '#38bdf8',
  target: '#38bdf8',
}
/** Altura das marcas planas (quadrado, anéis): um pouco acima da pata e do fio. */
const MARK_HEIGHT = 0.1
/** Meio lado do quadradinho aberto e espessura do traço (unidades da grelha). */
const SQUARE_HALF = 0.13
const SQUARE_LINE = 0.045
/** Um anel de 4 lados com o 1.º vértice a 45° é um quadrado; o raio vai até ao canto (×√2). */
const SQUARE_RING: [number, number, number, number, number] = [
  (SQUARE_HALF - SQUARE_LINE) * Math.SQRT2,
  SQUARE_HALF * Math.SQRT2,
  4,
  1,
  Math.PI / 4,
]
/** Deitado no chão (o anel do three.js nasce de pé, no plano XY). */
const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0]

interface TerminalDotProps {
  id: TerminalId
  position: [number, number, number]
  mark: TerminalMark
  wiringFrom: TerminalId | null
  onClick: (terminal: TerminalId) => void
}

/**
 * Um pino de ligação, como no LTspice: quadradinho aberto se está livre, nada se tem um fio
 * (o fio continua a pata), bola cheia se é ponto de junção. Por cima, o realce: anel claro com
 * o rato em cima, anel azul cheio na origem do fio, anel azul fino nos terminais que o podem
 * receber. A zona de clique (invisível) é maior do que a marca.
 */
function TerminalDot({ id, position, mark, wiringFrom, onClick }: TerminalDotProps) {
  const [hover, setHover] = useState(false)
  const highlight = terminalHighlight(id, hover, wiringFrom)
  // As marcas são finas: desenham-se sempre por cima (depthTest desligado) para não ficarem
  // escondidas dentro da pata do modelo 3D.
  const overlay = { depthTest: false, depthWrite: false, transparent: true } as const

  return (
    <group position={position}>
      <mesh
        // Marca de pino: o corpo do componente deixa passar o clique (ver terminalPick.ts).
        userData={{ terminalId: id }}
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

      {/* Terminal livre: quadradinho aberto (fica azul com o rato ou na origem do fio). */}
      {mark === 'open' && (
        <mesh
          position={[0, MARK_HEIGHT - position[1], 0]}
          rotation={FLAT}
          scale={highlight === 'hover' || highlight === 'origin' ? 1.25 : 1}
          renderOrder={3}
          raycast={() => undefined}
        >
          <ringGeometry args={SQUARE_RING} />
          <meshBasicMaterial
            {...overlay}
            color={
              highlight === 'hover' || highlight === 'origin'
                ? PIN_COLORS[highlight]
                : PIN_COLORS.open
            }
          />
        </mesh>
      )}

      {/* Ponto de junção: bola cheia da cor do fio, por cima das pontas dos fios. */}
      {mark === 'junction' && (
        <mesh position={[0, 0.07 - position[1], 0]} raycast={() => undefined}>
          <cylinderGeometry args={[0.15, 0.15, 0.05, 20]} />
          <meshStandardMaterial color={PIN_COLORS.junction} />
        </mesh>
      )}

      {/* Realce: anel à volta do pino. */}
      {highlight !== 'none' && (
        <mesh
          position={[0, MARK_HEIGHT - position[1], 0]}
          rotation={FLAT}
          renderOrder={2}
          raycast={() => undefined}
        >
          <ringGeometry args={highlight === 'target' ? [0.2, 0.235, 32] : [0.2, 0.27, 32]} />
          <meshBasicMaterial
            {...overlay}
            color={PIN_COLORS[highlight]}
            opacity={highlight === 'target' ? 0.55 : 0.9}
          />
        </mesh>
      )}
    </group>
  )
}
