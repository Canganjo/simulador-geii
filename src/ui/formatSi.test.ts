import { describe, expect, it } from 'vitest'
import { formatSi } from './formatSi'

describe('formatSi', () => {
  it.each([
    [1000, 'Ω', '1 kΩ'],
    [470, 'Ω', '470 Ω'],
    [4700, 'Ω', '4,7 kΩ'],
    [1e6, 'Ω', '1 MΩ'],
    [1e-3, 'Ω', '1 mΩ'],
    [12, 'V', '12 V'],
    [0.02, 'A', '20 mA'],
    [0.0212766, 'A', '21,3 mA'], // teste 6 da planilha
    [0.25, 'W', '250 mW'],
    [0.0000015, 'A', '1,5 µA'],
    [-12, 'V', '−12 V'.replace('−', '-')],
    [0, 'A', '0 A'],
  ] as const)('%s %s → "%s"', (value, unit, expected) => {
    expect(formatSi(value, unit)).toBe(expected)
  })

  it('999,96 arredonda para o prefixo seguinte: "1 k", não "1000"', () => {
    expect(formatSi(999.96, 'Ω')).toBe('1 kΩ')
  })

  it('um valor que não é finito mostra um traço', () => {
    expect(formatSi(Number.NaN, 'V')).toBe('— V')
  })
})
