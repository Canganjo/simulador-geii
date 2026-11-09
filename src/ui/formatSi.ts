/**
 * Mostra um valor SI com prefixo, à portuguesa: 1000 Ω → "1 kΩ", 0,0212766 A → "21,3 mA".
 *
 * O core trabalha SEMPRE em unidades SI (V, A, Ω, W); os prefixos são só para mostrar
 * (regra 7 do CLAUDE.md), por isso esta função vive em src/ui.
 */

const PREFIXES: readonly { exponent: number; symbol: string }[] = [
  { exponent: 9, symbol: 'G' },
  { exponent: 6, symbol: 'M' },
  { exponent: 3, symbol: 'k' },
  { exponent: 0, symbol: '' },
  { exponent: -3, symbol: 'm' },
  { exponent: -6, symbol: 'µ' },
  { exponent: -9, symbol: 'n' },
  { exponent: -12, symbol: 'p' },
]

/** `digits` = algarismos significativos (3 por defeito: 21,3 mA). */
export function formatSi(value: number, unit: string, digits = 3): string {
  if (!Number.isFinite(value)) return `— ${unit}`
  if (value === 0) return `0 ${unit}`

  const magnitude = Math.floor(Math.log10(Math.abs(value)))
  const prefix =
    PREFIXES.find((p) => magnitude >= p.exponent) ?? PREFIXES[PREFIXES.length - 1] ?? PREFIXES[0]
  if (!prefix) return `${value} ${unit}`

  const scaled = value / 10 ** prefix.exponent
  // toPrecision dá "21.3" ou "1.00e+3"; Number(...) tira os zeros a mais ("1.00" → 1).
  let rounded = Number(scaled.toPrecision(digits))
  // 999,6 → arredonda para 1000: passa para o prefixo seguinte (1 k em vez de 1000).
  if (Math.abs(rounded) >= 1000 && prefix.exponent < 9) {
    return formatSi(Math.sign(value) * 10 ** (prefix.exponent + 3), unit, digits)
  }
  if (Object.is(rounded, -0)) rounded = 0
  return `${String(rounded).replace('.', ',')} ${prefix.symbol}${unit}`
}
