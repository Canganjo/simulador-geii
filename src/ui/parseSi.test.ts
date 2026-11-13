import { describe, expect, it } from 'vitest'
import { formatSi } from './formatSi'
import { parseSi } from './parseSi'

describe('parseSi', () => {
  it.each([
    ['470', 'Ω', 470],
    ['4,7k', 'Ω', 4700],
    ['4.7k', 'Ω', 4700],
    ['4,7 kΩ', 'Ω', 4700],
    ['4k7', 'Ω', 4700], // código das resistências: a letra faz de vírgula
    ['4R7', 'Ω', 4.7],
    ['1M', 'Ω', 1e6],
    ['2m', 'A', 0.002], // m minúsculo = mili
    ['20 mA', 'A', 0.02],
    ['12', 'V', 12],
    ['12V', 'V', 12],
    ['0,25 W', 'W', 0.25],
    ['1e3', 'Ω', 1000],
    ['1,5u', 'A', 1.5e-6],
    ['1,5µ', 'A', 1.5e-6],
    ['100 ohm', 'Ω', 100],
    ['  2,2K ', 'Ω', 2200],
    ['-5', 'V', -5], // o sinal passa; os limites do catálogo decidem se vale
  ] as const)('"%s" (%s) → %s', (text, unit, expected) => {
    expect(parseSi(text, unit)).toBe(expected)
  })

  it.each(['', 'abc', 'k', '4,7x', '1..2', '4R', 'R7', '12 V V', '2g'])(
    '"%s" não é um número → null',
    (text) => {
      expect(parseSi(text, 'V')).toBeNull()
    },
  )

  it('lê de volta o que formatSi escreve (sem perder o valor)', () => {
    for (const value of [470, 4700, 0.0212766, 1e6, 0.25, 12]) {
      const shown = formatSi(value, 'Ω', 6)
      expect(parseSi(shown, 'Ω')).toBeCloseTo(value, 9)
    }
  })
})
