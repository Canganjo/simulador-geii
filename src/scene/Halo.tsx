import { useMemo } from 'react'
import { AdditiveBlending, CanvasTexture, SRGBColorSpace } from 'three'

/**
 * Auréola de luz (como no mockup): um disco desfocado que soma luz por cima do LED ou da
 * lâmpada acesos. É um "sprite": fica sempre virado para a câmara. O rato atravessa-o.
 */
interface Props {
  color: string
  /** Força do brilho, de 0 a 1 (vem da simulação). */
  strength: number
  /** Altura do centro da luz no modelo. */
  height: number
  /** Diâmetro máximo (com brilho 1). */
  size: number
}

let gradient: CanvasTexture | null = null

/** Textura partilhada: branco no centro, a desvanecer até transparente na borda. */
function haloTexture(): CanvasTexture {
  if (gradient) return gradient
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const g = canvas.getContext('2d')
  if (g) {
    const radial = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    radial.addColorStop(0, 'rgba(255,255,255,1)')
    radial.addColorStop(0.25, 'rgba(255,255,255,0.55)')
    radial.addColorStop(0.6, 'rgba(255,255,255,0.12)')
    radial.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = radial
    g.fillRect(0, 0, 128, 128)
  }
  gradient = new CanvasTexture(canvas)
  gradient.colorSpace = SRGBColorSpace
  return gradient
}

export function Halo({ color, strength, height, size }: Props) {
  const map = useMemo(() => haloTexture(), [])
  const s = size * (0.45 + 0.55 * Math.min(1, Math.max(0, strength)))
  return (
    <sprite position={[0, height, 0]} scale={[s, s, 1]} raycast={() => undefined}>
      <spriteMaterial
        map={map}
        color={color}
        transparent
        opacity={0.35 + 0.65 * strength}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </sprite>
  )
}
