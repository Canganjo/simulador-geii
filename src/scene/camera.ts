/**
 * Câmara da zona livre (ortográfica).
 *
 * - Inclinada ~55° em relação à vertical (mais afastada para a frente, z, do que alta, y): vê-se
 *   o tampo E a frente dos componentes (o visor da fonte, a cúpula do LED…), como numa bancada.
 * - Zoom = píxeis por quadrado da grelha. Com 64, um componente (2 quadrados) ocupa ~130 px (1,6× mais do que antes):
 *   vê-se bem logo ao abrir, sem ter de dar zoom (como no Tinkercad, KiCad ou LTspice).
 */
export const CAMERA_POSITION: [number, number, number] = [0, 9, 13]
export const CAMERA_ZOOM = 64

/** Ângulo da câmara em relação à vertical, em graus (0° = vista de cima). */
export function cameraTiltDegrees(position: readonly [number, number, number] = CAMERA_POSITION) {
  const [, y, z] = position
  return (Math.atan2(z, y) * 180) / Math.PI
}
