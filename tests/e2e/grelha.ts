import { CAMERA_POSITION, CAMERA_ZOOM } from '../../src/scene/camera.ts'

/**
 * Os testes E2E foram escritos com a câmara antiga (zoom 40, posição [0, 20, 12]).
 * Estas funções convertem esses píxeis para a câmara atual (src/scene/camera.ts), para os
 * componentes caírem nos MESMOS quadrados da grelha:
 *   - na horizontal, 1 quadrado = zoom píxeis;
 *   - na vertical, 1 quadrado = zoom × cos(inclinação) píxeis (o chão é visto de lado).
 */
const OLD_ZOOM = 40
const OLD_COS = 20 / Math.hypot(20, 12)
const [, height, distance] = CAMERA_POSITION
const COS = height / Math.hypot(height, distance)

/** Píxeis na horizontal (câmara antiga) → píxeis na câmara atual. */
export const sx = (px: number) => (px * CAMERA_ZOOM) / OLD_ZOOM
/** Píxeis na vertical (câmara antiga) → píxeis na câmara atual. */
export const sy = (px: number) => (px * CAMERA_ZOOM * COS) / (OLD_ZOOM * OLD_COS)
