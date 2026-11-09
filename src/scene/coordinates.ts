/**
 * Coordenadas: modelo (esquema no plano) ↔ cena 3D.
 *
 * - No MODELO (src/core) um componente está num ponto (x, y) da grelha, com x para a direita e
 *   y para cima, como num esquema em papel. 1 unidade = 1 célula da grelha.
 * - Na CENA (Three.js) o "chão" é o plano XZ e o Y aponta para cima. Com a câmara a olhar de
 *   cima, o y do esquema corresponde a −z:   modelo (x, y)  →  cena (x, 0, −y).
 */

import type { ComponentKind, Rotation, Vec2 } from '../core/model'

/** Ponto da grelha mais próximo (as posições são sempre números inteiros). */
export function snapToGrid(point: Vec2): Vec2 {
  // `+ 0` transforma −0 em 0 (Math.round(−0,4) dá −0).
  return { x: Math.round(point.x) + 0, y: Math.round(point.y) + 0 }
}

/** Modelo (x, y) → cena [x, 0, −y]. */
export function modelToScene(point: Vec2, height = 0): [number, number, number] {
  return [point.x, height, -point.y + 0]
}

/** Cena (x, ?, z) → modelo (x, −z). A altura é ignorada. */
export function sceneToModel(x: number, z: number): Vec2 {
  return { x, y: -z + 0 }
}

/** Rotação no plano do esquema, no sentido anti-horário (como em matemática). */
export function rotateOffset(offset: Vec2, rotation: Rotation): Vec2 {
  switch (rotation) {
    case 0:
      return { ...offset }
    case 90:
      return { x: -offset.y + 0, y: offset.x }
    case 180:
      return { x: -offset.x + 0, y: -offset.y + 0 }
    case 270:
      return { x: offset.y, y: -offset.x + 0 }
  }
}

/**
 * Posição dos terminais em relação ao centro do componente (rotação 0°).
 * Os dipolos ocupam 2 células e têm os terminais nas pontas, EXATAMENTE em pontos da grelha:
 * assim, mais tarde, os fios ligam-se sempre a pontos da grelha.
 */
export function terminalOffsets(kind: ComponentKind): Vec2[] {
  if (kind === 'ground') return [{ x: 0, y: 1 }] // o terminal fica em cima do símbolo
  return [
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ]
}

/**
 * Primeira célula livre a partir de `start`, procurando em "anéis" à volta dele
 * (para dois cliques no menu não porem dois componentes no mesmo sítio).
 */
export function findFreeCell(start: Vec2, occupied: readonly Vec2[], maxRadius = 20): Vec2 {
  const origin = snapToGrid(start)
  const taken = new Set(occupied.map((p) => `${p.x},${p.y}`))
  const isFree = (p: Vec2) => !taken.has(`${p.x},${p.y}`)
  if (isFree(origin)) return origin
  // Anel r: células à distância r (distância de "xadrez"). Passo 2 em x: os dipolos têm 2 células.
  for (let r = 1; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
        const p = { x: origin.x + dx * 3, y: origin.y + dy * 2 }
        if (isFree(p)) return p
      }
    }
  }
  return origin
}
