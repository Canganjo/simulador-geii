/**
 * Caminho das cargas ao longo de um fio (só geometria no plano, sem Three.js).
 *
 * O traçado de um fio é uma linha quebrada (pontos da grelha, troços horizontais e verticais).
 * Para pôr uma carga a uma distância `s` do início, procura-se o troço onde `s` cai e
 * interpola-se dentro dele. As cargas ficam com um espaçamento constante e andam todas juntas
 * (uma "fase" por fio), como contas num fio.
 */

import type { Vec2 } from '../core/model'

/** Distância entre duas cargas seguidas (células da grelha). */
export const CHARGE_SPACING = 0.5

export interface ChargePath {
  points: readonly Vec2[]
  /** Distância do início até cada ponto: [0, d1, d1 + d2, …]. */
  cumulative: readonly number[]
  length: number
}

export function makeChargePath(points: readonly Vec2[]): ChargePath {
  const cumulative = [0]
  let length = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if (a && b) length += Math.hypot(b.x - a.x, b.y - a.y)
    cumulative.push(length)
  }
  return { points, cumulative, length }
}

/** Quantas cargas cabem no fio (pelo menos uma). */
export function chargeCount(length: number, spacing = CHARGE_SPACING): number {
  return Math.max(1, Math.floor(length / spacing))
}

/**
 * Ponto à distância `s` do início (0 ≤ s ≤ comprimento), escrito em `out` (não cria objetos:
 * é chamado para cada carga, a cada imagem).
 */
export function pointAt(path: ChargePath, s: number, out: Vec2): Vec2 {
  const { points, cumulative } = path
  let i = 1
  while (i < points.length - 1 && (cumulative[i] ?? 0) < s) i++
  const a = points[i - 1] ?? points[0]
  const b = points[i] ?? a
  const start = cumulative[i - 1] ?? 0
  const segment = (cumulative[i] ?? start) - start
  const t = segment > 0 ? Math.min(Math.max((s - start) / segment, 0), 1) : 0
  out.x = (a?.x ?? 0) + ((b?.x ?? 0) - (a?.x ?? 0)) * t
  out.y = (a?.y ?? 0) + ((b?.y ?? 0) - (a?.y ?? 0)) * t
  return out
}

/** Resto sempre positivo: −0,1 mod 0,5 = 0,4 (as cargas a andar para trás também dão a volta). */
export function wrap(value: number, period: number): number {
  return ((value % period) + period) % period
}

/**
 * Transitório: que instante simulado mostrar ao fim de `elapsed` segundos reais.
 * A simulação inteira passa em `playbackSeconds` e recomeça (em ciclo).
 * Devolve o índice da amostra (0 … count − 1).
 */
export function playbackIndex(elapsed: number, count: number, playbackSeconds: number): number {
  if (count <= 1 || playbackSeconds <= 0) return Math.max(count - 1, 0)
  const fraction = wrap(elapsed, playbackSeconds) / playbackSeconds
  return Math.min(Math.floor(fraction * count), count - 1)
}
