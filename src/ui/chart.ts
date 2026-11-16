/**
 * Contas do gráfico u(t) / i(t) do transitório (E10-5). Sem React: só números, testáveis.
 *
 * - niceTicks: marcas "redondas" nos eixos (1, 2 ou 5 × 10ⁿ), como num osciloscópio.
 * - downsample: com 100 000 passos não se desenham 100 000 pontos — fica no máximo ~2 por píxel,
 *   guardando o mínimo e o máximo de cada fatia (os picos não desaparecem).
 * - nearestIndex: o instante simulado mais perto de um tempo (para o cursor).
 * - timeConstant: τ medido na curva (instante em que fez 63,2 % do caminho até ao valor final).
 */

export interface Ticks {
  /** Início e fim do eixo (já arredondados para incluir as marcas). */
  min: number
  max: number
  /** Valores das marcas, do menor para o maior. */
  values: number[]
}

/** Passo "redondo" (1, 2 ou 5 × 10ⁿ) mais perto de `raw`. */
function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(raw))
  const fraction = raw / power
  const nice = fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10
  return nice * power
}

/**
 * Marcas de um eixo entre `min` e `max`, cerca de `count` marcas.
 * Um intervalo nulo (sinal constante, ex.: fonte de 10 V) ganha uma margem à volta.
 */
export function niceTicks(min: number, max: number, count = 5): Ticks {
  let lo = Math.min(min, max)
  let hi = Math.max(min, max)
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { min: 0, max: 1, values: [0, 1] }
  if (hi - lo < 1e-15 * Math.max(1, Math.abs(hi))) {
    const pad = Math.abs(hi) > 0 ? Math.abs(hi) * 0.1 : 1
    lo -= pad
    hi += pad
  }
  const step = niceStep((hi - lo) / Math.max(1, count - 1))
  const first = Math.floor(lo / step + 1e-9) * step
  const last = Math.ceil(hi / step - 1e-9) * step
  const values: number[] = []
  for (let k = 0; first + k * step <= last + step * 1e-9; k++) {
    // Arredondar evita 0,30000000000000004 nas etiquetas.
    values.push(Number((first + k * step).toPrecision(12)))
  }
  return { min: values[0] ?? lo, max: values.at(-1) ?? hi, values }
}

/**
 * Índices dos pontos a desenhar (por ordem): o primeiro, o último e, em cada uma de
 * `buckets` fatias, o ponto mais baixo e o mais alto. Com poucos pontos, devolve todos.
 */
export function downsample(values: readonly number[], buckets: number): number[] {
  const n = values.length
  if (n <= buckets * 2 + 2) return values.map((_, i) => i)
  const out: number[] = [0]
  const size = (n - 2) / buckets
  for (let b = 0; b < buckets; b++) {
    const start = 1 + Math.floor(b * size)
    const end = Math.min(n - 1, 1 + Math.floor((b + 1) * size))
    let lo = start
    let hi = start
    for (let i = start; i < end; i++) {
      if ((values[i] ?? 0) < (values[lo] ?? 0)) lo = i
      if ((values[i] ?? 0) > (values[hi] ?? 0)) hi = i
    }
    if (end > start) out.push(Math.min(lo, hi), ...(lo === hi ? [] : [Math.max(lo, hi)]))
  }
  out.push(n - 1)
  return out
}

/** Índice do instante de `times` (crescente) mais perto de `t`. */
export function nearestIndex(times: readonly number[], t: number): number {
  if (times.length === 0) return -1
  let lo = 0
  let hi = times.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if ((times[mid] ?? 0) <= t) lo = mid
    else hi = mid
  }
  return Math.abs((times[hi] ?? 0) - t) < Math.abs(t - (times[lo] ?? 0)) ? hi : lo
}

/** Fração do caminho percorrida ao fim de τ num sistema de 1.ª ordem: 1 − e⁻¹. */
export const ONE_TAU_FRACTION = 1 - Math.exp(-1) // 0,632

/**
 * τ medido na curva: o instante em que o valor fez 63,2 % do caminho entre o valor inicial e o
 * final (interpolando entre dois passos). null se a curva quase não muda, ou se nunca lá chega.
 */
export function timeConstant(times: readonly number[], values: readonly number[]): number | null {
  const v0 = values[0]
  const vEnd = values.at(-1)
  if (v0 === undefined || vEnd === undefined) return null
  const change = vEnd - v0
  const scale = Math.max(...values.map(Math.abs), 1e-30)
  if (Math.abs(change) < 1e-6 * scale) return null
  const target = v0 + ONE_TAU_FRACTION * change
  for (let i = 1; i < values.length; i++) {
    const a = values[i - 1] ?? 0
    const b = values[i] ?? 0
    const crossed = change > 0 ? a < target && b >= target : a > target && b <= target
    if (!crossed) continue
    const ta = times[i - 1] ?? 0
    const tb = times[i] ?? 0
    return ta + ((target - a) / (b - a)) * (tb - ta)
  }
  return null
}

/** Traço SVG ("M x y L x y …") de uma lista de pontos já em píxeis. */
export function svgPath(points: readonly { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
}
