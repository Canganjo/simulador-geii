/**
 * Da corrente de um fio para a animação das cargas: velocidade, sentido e cor.
 *
 * As correntes de um circuito vão de µA (díodo bloqueado) a vários A (curto-circuito). Com uma
 * velocidade proporcional a I, 1 mA ficava parado e 10 A saía do ecrã. Por isso usa-se uma
 * escala LOGARÍTMICA: cada década de corrente (×10) soma o mesmo à velocidade, entre uma
 * velocidade mínima (ainda se vê a mexer) e uma máxima (ainda se segue com os olhos).
 *
 *   |I| < 1 µA        → parado (considera-se 0 A)
 *   1 µA … 10 A       → de MIN_SPEED a MAX_SPEED, uma década de cada vez
 *   |I| > 10 A        → MAX_SPEED (limite)
 *
 * Só funções puras, sem Three.js: a cena (src/scene/ChargeFlow.tsx) usa-as em cada imagem.
 */

/** Abaixo disto a corrente conta como zero: as cargas ficam paradas (A). */
export const CURRENT_THRESHOLD = 1e-6
/** A partir desta corrente a velocidade já é a máxima (A). */
export const SATURATION_CURRENT = 10
/** Velocidade das cargas com a corrente mais pequena que se vê (células da grelha por segundo). */
export const MIN_SPEED = 0.4
/** Velocidade máxima das cargas (células da grelha por segundo). */
export const MAX_SPEED = 4
/** Acima disto o fio pisca a vermelho: corrente de curto-circuito numa bancada de estudante (A). */
export const OVERCURRENT_LIMIT = 1

/** Sentido convencional (do + para o −) ou sentido real dos eletrões (do − para o +). */
export type FlowDirection = 'conventional' | 'electron'

/**
 * Nível da corrente entre 0 e 1, em escala logarítmica: 0 = abaixo do limiar, 1 = 10 A ou mais.
 * Ex.: 1 mA está 3 décadas acima de 1 µA, num total de 7 → 3/7 ≈ 0,43.
 */
export function currentLevel(current: number): number {
  const magnitude = Math.abs(current)
  if (!(magnitude >= CURRENT_THRESHOLD)) return 0 // também apanha NaN
  const decades = Math.log10(magnitude / CURRENT_THRESHOLD)
  const total = Math.log10(SATURATION_CURRENT / CURRENT_THRESHOLD)
  return Math.min(decades / total, 1)
}

export interface ChargeSpeedOptions {
  direction?: FlowDirection
  /** Cursor "Velocidade da animação": multiplica tudo (1 = normal). */
  scale?: number
}

/**
 * Velocidade das cargas ao longo de um fio, com sinal (células/s).
 * Positiva = as cargas andam do `from` para o `to` do fio. Corrente abaixo do limiar → 0.
 * No sentido dos eletrões o sinal troca (os eletrões andam ao contrário da corrente).
 */
export function chargeSpeed(current: number, options: ChargeSpeedOptions = {}): number {
  const level = currentLevel(current)
  if (level === 0) return 0
  const speed = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * level
  const sign = Math.sign(current) * (options.direction === 'electron' ? -1 : 1)
  return sign * speed * (options.scale ?? 1)
}

/** Cor de um fio conforme |I|: cinzento sem corrente, depois de amarelo (pouca) a vermelho (muita). */
export function currentColor(current: number): string {
  const level = currentLevel(current)
  if (level === 0) return '#94a3b8' // cinzento (slate-400)
  // Amarelo #facc15 → vermelho #ef4444, misturados pelo nível.
  const mix = (a: number, b: number) => Math.round(a + (b - a) * level)
  const r = mix(0xfa, 0xef)
  const g = mix(0xcc, 0x44)
  const b = mix(0x15, 0x44)
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** Corrente perigosa (curto-circuito): o fio pisca a vermelho. */
export function isOvercurrent(current: number, limit = OVERCURRENT_LIMIT): boolean {
  return Math.abs(current) > limit
}
