import { useFrame } from '@react-three/fiber'
import { type RefObject } from 'react'
import { Vector3 } from 'three'

/**
 * "Âncoras" no ecrã: pequenos elementos HTML invisíveis colocados EXATAMENTE em cima de pontos
 * da cena (terminais, meio dos fios). Servem para os testes E2E saberem em que píxel clicar e
 * para leitores de ecrã (têm atributos data-*). Não apanham o rato (pointer-events: none).
 *
 * Em vez de um `Html` do drei por ponto (uma raiz React cada, pesado e instável), há UMA camada
 * HTML fora do <Canvas>; este componente, dentro do <Canvas>, projeta cada ponto 3D para o ecrã
 * a cada frame e move o elemento correspondente.
 *
 * Cada âncora tem `data-anchor="x,y,z"` (posição na cena).
 */
export function AnchorProjector({ layer }: { layer: RefObject<HTMLDivElement | null> }) {
  const point = new Vector3()

  useFrame(({ camera, size }) => {
    const root = layer.current
    if (!root) return
    for (const el of root.querySelectorAll<HTMLElement>('[data-anchor]')) {
      const [x = 0, y = 0, z = 0] = (el.dataset.anchor ?? '').split(',').map(Number)
      point.set(x, y, z).project(camera)
      const px = ((point.x + 1) / 2) * size.width
      const py = ((1 - point.y) / 2) * size.height
      el.style.transform = `translate(${px - 2}px, ${py - 2}px)`
    }
  })

  return null
}
