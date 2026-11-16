import { describe, expect, it } from 'vitest'
import {
  downsample,
  nearestIndex,
  niceTicks,
  ONE_TAU_FRACTION,
  svgPath,
  timeConstant,
} from './chart'

describe('niceTicks', () => {
  it('0 a 0,5 s → 0; 0,1; 0,2; 0,3; 0,4; 0,5 (passo 0,1)', () => {
    // (0,5 − 0) / 5 = 0,1 → já é "redondo" (1 × 10⁻¹)
    expect(niceTicks(0, 0.5, 6)).toEqual({ min: 0, max: 0.5, values: [0, 0.1, 0.2, 0.3, 0.4, 0.5] })
  })

  it('0 a 9,93 V → 0, 2, 4, 6, 8, 10 (o eixo vai até 10, para caber a curva)', () => {
    // 9,93 / 4 = 2,48 → passo "redondo" 2 → marcas até ao primeiro múltiplo ≥ 9,93
    expect(niceTicks(0, 9.93, 5).values).toEqual([0, 2, 4, 6, 8, 10])
  })

  it('valores em mA, negativos e positivos', () => {
    expect(niceTicks(-0.003, 0.0045, 5).values).toEqual([-0.004, -0.002, 0, 0.002, 0.004, 0.006])
  })

  it('sinal constante (fonte de 10 V) → margem de 10 % à volta', () => {
    const t = niceTicks(10, 10, 5)
    expect(t.min).toBeLessThanOrEqual(9)
    expect(t.max).toBeGreaterThanOrEqual(11)
  })

  it('tudo a zero (corrente num condensador em DC) → eixo de −1 a 1', () => {
    const t = niceTicks(0, 0, 5)
    expect(t.min).toBe(-1)
    expect(t.max).toBe(1)
  })
})

describe('downsample', () => {
  it('poucos pontos → todos', () => {
    expect(downsample([1, 2, 3], 10)).toEqual([0, 1, 2])
  })

  it('muitos pontos → poucos, mas o pico (e o primeiro e o último) ficam', () => {
    const values = Array.from({ length: 10_001 }, (_, i) => (i === 4321 ? 99 : Math.sin(i / 100)))
    const idx = downsample(values, 200)
    expect(idx.length).toBeLessThanOrEqual(2 * 200 + 2)
    expect(idx[0]).toBe(0)
    expect(idx.at(-1)).toBe(10_000)
    expect(idx).toContain(4321)
    // Por ordem crescente (o traço vai sempre para a frente no tempo).
    expect([...idx].sort((a, b) => a - b)).toEqual(idx)
  })
})

describe('nearestIndex', () => {
  const times = [0, 0.001, 0.002, 0.003]
  it('o instante mais perto (para o cursor)', () => {
    expect(nearestIndex(times, 0.0012)).toBe(1)
    expect(nearestIndex(times, 0.0018)).toBe(2)
    expect(nearestIndex(times, -5)).toBe(0)
    expect(nearestIndex(times, 5)).toBe(3)
    expect(nearestIndex([], 1)).toBe(-1)
  })
})

describe('timeConstant', () => {
  it('carga RC exata u = 10·(1 − e^(−t/0,1)) → τ = 0,1 s', () => {
    // Ao fim de 1 s (10τ) o valor final é 9,99955 V ≈ 10 V; 63,2 % de 9,99955 = 6,3209 V,
    // atingido em t = −0,1·ln(1 − 0,63209·0,99995) ≈ 0,1 s.
    const times = Array.from({ length: 1001 }, (_, k) => k * 0.001)
    const u = times.map((t) => 10 * (1 - Math.exp(-t / 0.1)))
    expect(ONE_TAU_FRACTION).toBeCloseTo(0.632121, 6)
    expect(timeConstant(times, u)).toBeCloseTo(0.1, 3)
  })

  it('descarga (a descer) também funciona: u = 5·e^(−t/0,002) → τ = 2 ms', () => {
    const times = Array.from({ length: 2001 }, (_, k) => k * 1e-5)
    const u = times.map((t) => 5 * Math.exp(-t / 0.002))
    expect(timeConstant(times, u)).toBeCloseTo(0.002, 5)
  })

  it('curva parada (sinal constante) → sem τ', () => {
    expect(timeConstant([0, 1, 2], [10, 10, 10])).toBeNull()
  })
})

describe('svgPath', () => {
  it('M no primeiro ponto, L nos seguintes, 1 casa decimal', () => {
    expect(
      svgPath([
        { x: 0, y: 10 },
        { x: 5.25, y: 2 },
      ]),
    ).toBe('M0.0 10.0 L5.3 2.0')
  })
})
