import { describe, expect, it } from 'vitest'
import { meterDisplay } from './meterDisplay'

describe('visor dos instrumentos', () => {
  it('antes de Simular mostra traços', () => {
    expect(meterDisplay('V', null)).toBe('--- V')
    expect(meterDisplay('A', null)).toBe('--- A')
  })

  it('3 algarismos significativos com o prefixo certo', () => {
    expect(meterDisplay('V', 8)).toBe('8.00 V')
    expect(meterDisplay('V', 12)).toBe('12.0 V')
    expect(meterDisplay('V', 230)).toBe('230 V')
    expect(meterDisplay('A', 0.004)).toBe('4.00 mA')
    expect(meterDisplay('A', 0.0213)).toBe('21.3 mA')
    expect(meterDisplay('A', 1.2e-4)).toBe('120 µA')
    expect(meterDisplay('V', -5)).toBe('-5.00 V') // ligado ao contrário: leitura negativa
  })

  it('zero e ruído numérico mostram 0.00', () => {
    expect(meterDisplay('A', 0)).toBe('0.00 A')
    expect(meterDisplay('A', 3e-13)).toBe('0.00 A')
  })
})
