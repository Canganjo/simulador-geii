import { useThree } from '@react-three/fiber'
import { useEffect, type RefObject } from 'react'
import { Plane, Raycaster, Vector2, Vector3 } from 'three'
import type { Vec2 } from '../core/model'
import { modelToScene, sceneToModel } from './coordinates'

/** Converte um ponto do ecrã (clientX, clientY) no ponto do chão do esquema (modelo). */
export type ScreenToModel = (clientX: number, clientY: number) => Vec2 | null

/** O contrário: um ponto do chão do esquema (modelo) → píxel do ecrã (clientX, clientY). */
export type ModelToScreen = (point: Vec2) => { x: number; y: number } | null

const GROUND = new Plane(new Vector3(0, 1, 0), 0) // o plano y = 0 da cena

/**
 * Fica DENTRO do <Canvas> (precisa da câmara) e entrega, através de `pickerRef`, uma função que
 * transforma a posição do rato num ponto do chão: lança-se um "raio" da câmara através do píxel
 * e vê-se onde ele bate no plano y = 0.
 */
export function GroundPicker({
  pickerRef,
  projectorRef,
}: {
  pickerRef: RefObject<ScreenToModel | null>
  /** Opcional: recebe a função modelo → ecrã (usada pelo retângulo de seleção). */
  projectorRef?: RefObject<ModelToScreen | null>
}) {
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
    if (projectorRef) {
      const point = new Vector3()
      projectorRef.current = (p) => {
        const rect = canvas.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return null
        point.set(...modelToScene(p)).project(camera)
        return {
          x: rect.left + ((point.x + 1) / 2) * rect.width,
          y: rect.top + ((1 - point.y) / 2) * rect.height,
        }
      }
    }
    return () => {
      pickerRef.current = null
      if (projectorRef) projectorRef.current = null
    }
  }, [camera, canvas, pickerRef, projectorRef])

  return null
}
