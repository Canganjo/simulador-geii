import { describe, expect, it } from 'vitest'
import { stepVoltage } from './sourceStep'

const LIMITS = { min: 0, max: 1000 }

describe('stepVoltage (botões + / − da fonte)', () => {
  it('clique: ±0,1 V; Shift: ±1 V', () => {
    expect(stepVoltage(12, 1, false, LIMITS)).toBe(12.1)
    expect(stepVoltage(12, -1, false, LIMITS)).toBe(11.9)
    expect(stepVoltage(12, 1, true, LIMITS)).toBe(13)
    expect(stepVoltage(12, -1, true, LIMITS)).toBe(11)
  })

  it('30 cliques em + a partir de 0 V dão 3 V certinhos (sem 2,9999999)', () => {
    let v = 0
    for (let k = 0; k < 30; k++) v = stepVoltage(v, 1, false, LIMITS)
    expect(v).toBe(3)
  })

  it('um valor "torto" (4,73 V escrito à mão) passa para o múltiplo de 0,1 V seguinte', () => {
    // 4,73 + 0,1 = 4,83 → arredonda a 4,8 V
    expect(stepVoltage(4.73, 1, false, LIMITS)).toBe(4.8)
  })

  it('não sai dos limites: 0 V a 1000 V', () => {
    expect(stepVoltage(0, -1, false, LIMITS)).toBe(0)
    expect(stepVoltage(0.05, -1, true, LIMITS)).toBe(0)
    expect(stepVoltage(1000, 1, true, LIMITS)).toBe(1000)
  })
})
