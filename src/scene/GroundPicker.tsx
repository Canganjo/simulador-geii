import { useThree } from '@react-three/fiber'
import { useEffect, type RefObject } from 'react'
import { Plane, Raycaster, Vector2, Vector3 } from 'three'
import type { Vec2 } from '../core/model'
import { sceneToModel } from './coordinates'

/** Converte um ponto do ecrã (clientX, clientY) no ponto do chão do esquema (modelo). */
export type ScreenToModel = (clientX: number, clientY: number) => Vec2 | null

const GROUND = new Plane(new Vector3(0, 1, 0), 0) // o plano y = 0 da cena

/**
 * Fica DENTRO do <Canvas> (precisa da câmara) e entrega, através de `pickerRef`, uma função que
 * transforma a posição do rato num ponto do chão: lança-se um "raio" da câmara através do píxel
 * e vê-se onde ele bate no plano y = 0.
 */
export function GroundPicker({ pickerRef }: { pickerRef: RefObject<ScreenToModel | null> }) {
  const camera = useThree((s) => s.camera)
  const canvas = useThree((s) => s.gl.domElement)

  useEffect(() => {
    const raycaster = new Raycaster()
    const hit = new Vector3()
    pickerRef.current = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return null
      // Coordenadas normalizadas do ecrã: −1 … +1 (y para cima).
      const ndc = new Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(ndc, camera)
      return raycaster.ray.intersectPlane(GROUND, hit) ? sceneToModel(hit.x, hit.z) : null
    }
    return () => {
      pickerRef.current = null
    }
  }, [camera, canvas, pickerRef])

  return null
}
