/**
 * Lê um valor escrito pelo estudante e devolve-o em unidades SI (o contrário de `formatSi`).
 *
 *   "470" → 470 · "4,7k" → 4700 · "4.7 kΩ" → 4700 · "4k7" → 4700 · "2m" → 0,002 · "1M" → 1e6
 *
 * Aceita vírgula ou ponto, espaços, a unidade no fim (opcional) e a notação dos códigos de
 * resistências, em que a letra faz de vírgula: "4k7" = 4,7 k, "4R7" = 4,7 Ω.
 * Atenção às maiúsculas: "m" = mili, "M" = mega. "K" e "u" são aceites como "k" e "µ".
 * Devolve `null` se não for um número.
 */

/** Expoente (potência de 10) de cada prefixo. */
const EXPONENTS: Readonly<Record<string, number>> = {
  G: 9,
  M: 6,
  k: 3,
  K: 3,
  R: 0, // só na notação "4R7"
  m: -3,
  u: -6,
  µ: -6,
  μ: -6, // a letra grega mu (outro código Unicode que o "micro")
  n: -9,
  p: -12,
}

/**
 * número × 10^expoente, feito no TEXTO ("4.7e3") para não ter erros de arredondamento
 * (4.7 × 1000 em vírgula flutuante pode dar 4700.000000000001).
 */
function scaled(number: string, exponent: number): number | null {
  const [mantissa = '', ownExponent = '0'] = number.toLowerCase().split('e')
  const value = Number(`${mantissa}e${Number(ownExponent) + exponent}`)
  return Number.isFinite(value) ? value : null
}

const NUMBER = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?`
const PREFIX = '[GMkKmuµμnp]'
/** "12", "4.7k", "-3e-3", "2 m" */
const PLAIN = new RegExp(`^(${NUMBER})\\s*(${PREFIX})?$`, 'i')
/** "4k7", "1M5", "4R7" */
const CODE = /^(\d+)([GMkKRmuµμnp])(\d+)$/

export function parseSi(text: string, unit = ''): number | null {
  let s = text.trim().replace(/\s+/g, ' ').replace(',', '.')
  if (unit && s.endsWith(unit)) s = s.slice(0, -unit.length).trim()
  else if (unit === 'Ω' && /ohms?$/i.test(s)) s = s.replace(/ohms?$/i, '').trim()
  if (s === '') return null

  const code = CODE.exec(s)
  if (code) {
    const [, whole = '', letter = '', decimals = ''] = code
    const exponent = EXPONENTS[letter]
    return exponent === undefined ? null : scaled(`${whole}.${decimals}`, exponent)
  }

  const plain = PLAIN.exec(s)
  if (!plain) return null
  const [, number = '', prefix] = plain
  // O "i" do RegExp é só para o "e" do expoente: o prefixo tem de respeitar as maiúsculas.
  const exponent = prefix === undefined ? 0 : EXPONENTS[prefix]
  if (exponent === undefined || prefix === 'R') return null
  return scaled(number, exponent)
}
