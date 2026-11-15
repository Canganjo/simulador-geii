import type { Component } from '../core/model'
import type { ModelToScreen } from './GroundPicker'

/**
 * Retângulo de seleção (arrastar no vazio com o botão esquerdo, ou tocar duas vezes no touchpad
 * e arrastar): seleciona os componentes cujo CENTRO fica dentro do retângulo desenhado no ecrã.
 */

export interface ScreenPoint {
  x: number
  y: number
}

export interface ScreenRect {
  left: number
  top: number
  width: number
  height: number
}

/** Abaixo disto (px) um "arrasto" é só um clique (tira a seleção). */
export const DRAG_THRESHOLD = 4

/** Retângulo entre dois cantos quaisquer (arrastar para a esquerda ou para cima também serve). */
export function rectFromCorners(a: ScreenPoint, b: ScreenPoint): ScreenRect {
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  }
}

/** Verdadeiro se o rato andou o suficiente para ser um arrasto (e não um clique). */
export function isDrag(a: ScreenPoint, b: ScreenPoint): boolean {
  return Math.abs(a.x - b.x) > DRAG_THRESHOLD || Math.abs(a.y - b.y) > DRAG_THRESHOLD
}

/** IDs dos componentes com o centro dentro do retângulo (pela ordem do projeto). */
export function idsInsideRect(
  components: readonly Component[],
  rect: ScreenRect,
  toScreen: ModelToScreen,
): string[] {
  const right = rect.left + rect.width
  const bottom = rect.top + rect.height
  return components
    .filter((c) => {
      const p = toScreen(c.position)
      return p !== null && p.x >= rect.left && p.x <= right && p.y >= rect.top && p.y <= bottom
    })
    .map((c) => c.id)
}
