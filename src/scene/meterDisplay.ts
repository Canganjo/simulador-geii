/**
 * Texto do visor dos instrumentos na cena (como num multímetro de bancada).
 *
 * Antes de Simular o visor mostra traços ("--- V"); depois, a leitura com 3 algarismos
 * significativos e o prefixo certo: "8.00 V", "4.00 mA", "120 µA". Usa sempre o ponto decimal,
 * como os visores de 7 segmentos (o mesmo da fonte DC).
 */

const PREFIXES = [
  { factor: 1, symbol: '' },
  { factor: 1e-3, symbol: 'm' },
  { factor: 1e-6, symbol: 'µ' },
  { factor: 1e-9, symbol: 'n' },
] as const

/** 3 algarismos significativos: 8.00, 12.0, 230. */
function threeDigits(x: number): string {
  const size = Math.abs(x)
  return x.toFixed(size >= 100 ? 0 : size >= 10 ? 1 : 2)
}

export function meterDisplay(unit: 'V' | 'A', reading: number | null): string {
  if (reading === null || !Number.isFinite(reading)) return `--- ${unit}`
  // Abaixo de 1 nV / 1 nA mostra-se 0 (ruído numérico do cálculo).
  if (Math.abs(reading) < 1e-9) return `0.00 ${unit}`
  const size = Math.abs(reading)
  const prefix = PREFIXES.find((p) => size >= p.factor * 0.9995) ?? PREFIXES[PREFIXES.length - 1]
  return `${threeDigits(reading / prefix.factor)} ${prefix.symbol}${unit}`
}
