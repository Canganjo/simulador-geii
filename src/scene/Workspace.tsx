import { Grid, MapControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { MOUSE } from 'three'

/**
 * Zona livre 2.5D.
 *
 * - Câmara ORTOGRÁFICA: os objetos não ficam mais pequenos ao longe, por isso a grelha
 *   e as distâncias continuam "exatas" como num esquema. Está ligeiramente inclinada
 *   para se ver o volume dos componentes (ver docs/decisoes.md, D-006).
 * - O plano do circuito é o plano XZ do Three.js (Y aponta para cima).
 *   Conversão: posição do modelo (x, y) → cena (x, 0, −y).
 * - Navegação: roda do rato = zoom; botão direito ou do meio = deslocar (pan).
 *   O botão esquerdo fica livre para selecionar/arrastar componentes (etapa E2).
 */
export function Workspace() {
  return (
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

      <MapControls
        makeDefault
        enableRotate={false}
        minZoom={10}
        maxZoom={200}
        mouseButtons={{ MIDDLE: MOUSE.PAN, RIGHT: MOUSE.PAN }}
      />
    </Canvas>
  )
}
