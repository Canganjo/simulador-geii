import type { Vec2 } from '../core/model'
import { orthogonalRoute } from './coordinates'

/**
 * Traçado dos fios com CANTOS escolhidos pelo utilizador (como no Tinkercad).
 *
 * - Um fio novo não tem cantos guardados: o traçado é automático (um "L", ver orthogonalRoute).
 * - Ao arrastar um TROÇO, o traçado passa a ser guardado no fio como `waypoints`
 *   (os pontos do meio, sem os dois terminais). Assim, ao mexer num componente, o fio mantém
 *   a forma e só se reajusta nas pontas.
 * - Tudo em unidades da grelha; os cantos ficam sempre em pontos da grelha (números inteiros).
 */

const same = (p: Vec2, q: Vec2) => p.x === q.x && p.y === q.y

/** Verdadeiro se q está na mesma linha (horizontal ou vertical) que p e r. */
function collinear(p: Vec2, q: Vec2, r: Vec2): boolean {
  return (p.x === q.x && q.x === r.x) || (p.y === q.y && q.y === r.y)
}

/**
 * Limpa um traçado: tira pontos repetidos e cantos que não são cantos (pontos no meio de uma
 * linha reta, ou onde o fio volta para trás). O primeiro e o último ponto ficam sempre.
 */
export function simplifyRoute(points: readonly Vec2[]): Vec2[] {
  const out: Vec2[] = []
  for (const p of points) {
    const last = out.at(-1)
    if (last && same(last, p)) continue
    out.push({ ...p })
    // Enquanto os 3 últimos estiverem alinhados, o do meio não faz falta.
    while (out.length >= 3) {
      const [a, b, c] = out.slice(-3) as [Vec2, Vec2, Vec2]
      if (!collinear(a, b, c)) break
      out.splice(out.length - 2, 1)
      if (same(a, c)) out.pop() // voltou exatamente ao ponto anterior
    }
  }
  // Pode ter sobrado só um ponto (fio de comprimento 0): manter as duas pontas.
  const first = points[0]
  const lastPoint = points.at(-1)
  if (out.length === 1 && first && lastPoint) return [{ ...first }, { ...lastPoint }]
  return out
}

/**
 * Traçado completo de um fio de `a` a `b` passando pelos cantos guardados.
 * Entre dois pontos não alinhados faz um "L" (primeiro horizontal, depois vertical).
 */
export function wireRoute(a: Vec2, b: Vec2, waypoints?: readonly Vec2[]): Vec2[] {
  if (!waypoints || waypoints.length === 0) return orthogonalRoute(a, b)
  const stops = [a, ...waypoints, b]
  const points: Vec2[] = [{ ...a }]
  for (let i = 1; i < stops.length; i++) {
    const from = stops[i - 1] as Vec2
    const to = stops[i] as Vec2
    points.push(...orthogonalRoute(from, to).slice(1))
  }
  return simplifyRoute(points)
}

/** Verdadeiro se o troço i (do ponto i ao i+1) é horizontal. */
export function isHorizontal(points: readonly Vec2[], index: number): boolean {
  const p = points[index]
  const q = points[index + 1]
  return p !== undefined && q !== undefined && p.y === q.y && p.x !== q.x
}

/**
 * Arrasta o troço `index` de `amount` células na perpendicular:
 * troço horizontal → sobe (+) ou desce (−); troço vertical → direita (+) ou esquerda (−).
 *
 * As pontas do fio ficam presas aos terminais: se o troço tocar num terminal, cria-se um
 * pequeno troço novo (perpendicular) entre o terminal e o troço deslocado.
 * Devolve o traçado novo (já limpo).
 */
export function moveSegment(points: readonly Vec2[], index: number, amount: number): Vec2[] {
  const p = points[index]
  const q = points[index + 1]
  if (!p || !q || same(p, q) || amount === 0) return points.map((pt) => ({ ...pt }))
  const horizontal = p.y === q.y
  const shift = (pt: Vec2): Vec2 =>
    horizontal ? { x: pt.x, y: pt.y + amount } : { x: pt.x + amount, y: pt.y }

  const route = points.map((pt) => ({ ...pt }))
  let i = index
  // Ponta do início: duplica o terminal (o original fica, a cópia mexe-se).
  if (i === 0) {
    route.unshift({ ...p })
    i = 1
  }
  // Ponta do fim: idem.
  if (i + 1 === route.length - 1) route.push({ ...q })
  route[i] = shift(route[i] as Vec2)
  route[i + 1] = shift(route[i + 1] as Vec2)
  return simplifyRoute(route)
}

/** Os cantos a guardar no fio: o traçado sem os dois terminais. */
export function waypointsOf(route: readonly Vec2[]): Vec2[] {
  return route.slice(1, -1).map((p) => ({ ...p }))
}

/** Ponto do meio de cada troço (onde aparecem as pegas do fio selecionado). */
export function segmentMiddles(points: readonly Vec2[]): Vec2[] {
  return points.slice(1).map((q, i) => {
    const p = points[i] as Vec2
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
  })
}
