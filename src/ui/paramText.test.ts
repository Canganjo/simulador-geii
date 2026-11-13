import { describe, expect, it } from 'vitest'
import { formatSiInput } from './paramText'

describe('formatSiInput (valor para pôr num campo de texto)', () => {
  it.each([
    [4700, ',', '4,7k'],
    [470, ',', '470'],
    [0.02, '.', '20m'],
    [1234.5, ',', '1,2345k'], // 6 algarismos: não perde o valor
  ] as const)('%s → "%s"', (value, decimal, expected) => {
    expect(formatSiInput(value, decimal)).toBe(expected)
  })
})
