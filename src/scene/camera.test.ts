import { describe, expect, it } from 'vitest'
import { CAMERA_POSITION, CAMERA_ZOOM, cameraTiltDegrees } from './camera'

describe('câmara da zona livre', () => {
  it('está inclinada entre 45° e 60° (vê-se a frente dos componentes)', () => {
    expect(cameraTiltDegrees()).toBeGreaterThanOrEqual(45)
    expect(cameraTiltDegrees()).toBeLessThanOrEqual(60)
    expect(cameraTiltDegrees([0, 1, 0])).toBeCloseTo(0, 5) // de cima
  })

  it('abre perto: um componente de 2 quadrados ocupa mais de 100 px', () => {
    expect(2 * CAMERA_ZOOM).toBeGreaterThan(100)
    expect(CAMERA_POSITION[0]).toBe(0) // centrada na origem da grelha
  })
})
