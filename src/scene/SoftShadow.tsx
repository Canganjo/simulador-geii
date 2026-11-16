import { useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'

/**
 * Sombra suave no chão, por baixo de um componente ou de um fio (dá relevo, como numa bancada).
 *
 * Não é uma sombra "verdadeira" do three.js (essas pedem uma luz com mapa de sombras e um chão
 * de tamanho fixo, e a zona livre é infinita): é um retângulo desfocado, escuro e transparente,
 * desenhado uma vez numa imagem e partilhado por todos. O rato atravessa-o (não atrapalha os
 * cliques nos terminais nem nos fios).
 */
interface Props {
  /** Tamanho no chão: [ao longo de X, ao longo de Z] (unidades da grelha). */
  size: readonly [number, number]
  /** Deslocamento no chão [x, z] (ex.: um pouco para trás, longe da luz principal). */
  offset?: readonly [number, number]
  /** Força (0 a 1). */
  opacity?: number
}

let shared: CanvasTexture | null = null

/** Retângulo arredondado preto, desfocado nas bordas (transparente à volta). */
function shadowTexture(): CanvasTexture {
  if (shared) return shared
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const g = canvas.getContext('2d')
  if (g) {
    g.filter = 'blur(14px)'
    g.fillStyle = 'rgba(0,0,0,1)'
    g.beginPath()
    g.roundRect(28, 28, 72, 72, 18)
    g.fill()
  }
  shared = new CanvasTexture(canvas)
  shared.colorSpace = SRGBColorSpace
  return shared
}

export function SoftShadow({ size, offset = [0, 0], opacity = 0.5 }: Props) {
  const map = useMemo(() => shadowTexture(), [])
  // A imagem tem margem desfocada à volta (28 px de 128): o plano é maior do que a sombra
  // "cheia", para a borda esbater fora do componente.
  const grow = 128 / 72
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[offset[0], 0.004, offset[1]]}
      scale={[size[0] * grow, size[1] * grow, 1]}
      raycast={() => undefined}
      renderOrder={-1}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={map} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}
