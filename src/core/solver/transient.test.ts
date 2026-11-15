import { describe, expect, it } from 'vitest'
import type { Netlist } from '../netlist'
import { MAX_TRANSIENT_STEPS, solveTransient, type TransientResult } from './transient'

/**
 * Euler implícito com passo h, circuito de 1.ª ordem com constante de tempo τ e valor final X∞
 * (partindo de 0):
 *     xₖ₊₁ = (xₖ + a · X∞) / (1 + a),   a = h / τ
 *  →  xₖ = X∞ · (1 − (1 + a)^(−k))       (fórmula exata do método, calculável à mão)
 * A solução real é x(t) = X∞ · (1 − e^(−t/τ)); com h = τ/1000 a diferença é < 0,05 %.
 */

function ok(r: TransientResult) {
  if (!r.ok) throw new Error(`falhou: ${r.error.message}`)
  return r
}

function wave(r: ReturnType<typeof ok>, id: string) {
  const w = r.elements.get(id)
  if (!w) throw new Error(`sem resultados para ${id}`)
  return w
}

function expectRel(actual: number | undefined, expected: number, tolerance: number) {
  expect(actual).toBeDefined()
  expect(Math.abs((actual ?? NaN) - expected) / Math.abs(expected)).toBeLessThanOrEqual(tolerance)
}

/** V1 = 12 V ── R1 1 kΩ ── C1 1 µF ── GND : τ = R·C = 1 ms. */
function rc(step: number, duration = 1e-3): Netlist & { step: number } {
  return {
    step,
    nodeCount: 2,
    elements: [
      { type: 'voltage-source', id: 'V1', plus: 1, minus: 0, voltage: 12 },
      { type: 'resistor', id: 'R1', nodeA: 1, nodeB: 2, resistance: 1000 },
      { type: 'capacitor', id: 'C1', nodeA: 2, nodeB: 0, capacitance: 1e-6 },
    ],
    ...{ duration },
  }
}

describe('solveTransient — carga de um condensador (RC)', () => {
  // h = 1 µs, a = h/τ = 0,001 ; 1000 passos até t = τ = 1 ms
  const r = ok(solveTransient(rc(1e-6), { step: 1e-6, duration: 1e-3 }))
  const c = wave(r, 'C1')

  it('instantes 0, h, 2h … τ (1001 pontos)', () => {
    expect(r.times).toHaveLength(1001)
    expect(r.times[0]).toBe(0)
    expect(r.times[1000]).toBeCloseTo(1e-3, 15)
  })

  it('t = 0: condensador descarregado (0 V) → toda a tensão em R: i = 12 V / 1 kΩ = 12 mA', () => {
    expect(c.voltage[0]).toBe(0)
    expectRel(c.current[0], 0.012, 1e-6)
  })

  it('cada passo segue a fórmula do Euler implícito: uₖ = 12 · (1 − 1,001^(−k))', () => {
    // k = 1:    12 · (1 − 1/1,001)        = 0,011988012 V
    // k = 1000: 12 · (1 − 1,001^(−1000))  = 12 · (1 − 0,3680635) = 7,583238 V
    expectRel(c.voltage[1], 12 * (1 - 1.001 ** -1), 1e-9)
    expectRel(c.voltage[1000], 12 * (1 - 1.001 ** -1000), 1e-9)
    expectRel(c.voltage[1000], 7.583238, 1e-6)
  })

  it('em t = τ fica a ≈ 63 % de 12 V: 12 · (1 − e⁻¹) = 7,585447 V (diferença < 0,05 %)', () => {
    expectRel(c.voltage[1000], 12 * (1 - Math.exp(-1)), 5e-4)
  })

  it('a corrente desce: i(τ) = (12 − u(τ)) / 1 kΩ = 4,416762 mA', () => {
    expectRel(c.current[1000], (12 - 7.583238) / 1000, 1e-6)
    expectRel(wave(r, 'R1').current[1000], (12 - 7.583238) / 1000, 1e-6)
  })

  it('em cada instante a fonte dá exatamente o que R e C recebem (energia conservada)', () => {
    for (const k of [0, 1, 500, 1000]) {
      const total =
        (wave(r, 'V1').power[k] ?? NaN) +
        (wave(r, 'R1').power[k] ?? NaN) +
        (wave(r, 'C1').power[k] ?? NaN)
      expect(Math.abs(total)).toBeLessThan(1e-9)
    }
  })

  it('depois de 5τ está carregado a > 99 %: 12 · (1 − e⁻⁵) = 11,919 V', () => {
    const long = ok(solveTransient(rc(1e-5), { step: 1e-5, duration: 5e-3 }))
    const u = wave(long, 'C1').voltage.at(-1) ?? NaN
    expect(u).toBeGreaterThan(0.99 * 12)
    expectRel(u, 12 * (1 - Math.exp(-5)), 2e-3)
  })

  it('passo 2× mais pequeno → erro ≈ 2× mais pequeno (método de 1.ª ordem)', () => {
    const exact = 12 * (1 - Math.exp(-1))
    const err = (h: number) =>
      Math.abs(
        (wave(ok(solveTransient(rc(h), { step: h, duration: 1e-3 })), 'C1').voltage.at(-1) ?? NaN) -
          exact,
      )
    const ratio = err(1e-5) / err(5e-6)
    expect(ratio).toBeGreaterThan(1.9)
    expect(ratio).toBeLessThan(2.1)
  })
})

describe('solveTransient — bobina (RL)', () => {
  it('12 V + 100 Ω + 10 mH: i sobe para 120 mA; i(τ) = 75,83 mA (τ = L/R = 0,1 ms)', () => {
    //   Mesma equação que o RC: X∞ = E/R = 0,12 A, τ = L/R = 0,01/100 = 0,1 ms, h = τ/1000
    //   iₖ = 0,12 · (1 − 1,001^(−k)) → i(τ) = 0,12 · 0,6319365 = 0,07583238 A
    //   t = 0: i = 0 → toda a tensão na bobina: u = 12 V
    const r = ok(
      solveTransient(
        {
          nodeCount: 2,
          elements: [
            { type: 'voltage-source', id: 'V1', plus: 1, minus: 0, voltage: 12 },
            { type: 'resistor', id: 'R1', nodeA: 1, nodeB: 2, resistance: 100 },
            { type: 'inductor', id: 'L1', nodeA: 2, nodeB: 0, inductance: 0.01 },
          ],
        },
        { step: 1e-7, duration: 1e-4 },
      ),
    )
    const l = wave(r, 'L1')
    expect(l.current[0]).toBe(0)
    expectRel(l.voltage[0], 12, 1e-6)
    expectRel(l.current[1000], 0.07583238, 1e-6)
    expectRel(l.current[1000], 0.12 * (1 - Math.exp(-1)), 5e-4)
    // u(τ) = 12 − 100 · i(τ) = 4,416762 V
    expectRel(l.voltage[1000], 12 - 100 * 0.07583238, 1e-5)
  })
})

describe('solveTransient — descarga e casos especiais', () => {
  it('condensador carregado a 10 V descarrega em 1 kΩ: uₖ = 10 · 1,01^(−k)', () => {
    //   C1 (1 µF, 10 V em t = 0) ∥ R1 (1 kΩ), τ = 1 ms, h = 10 µs → a = 0,01
    //   u(τ) pelo método: 10 · 1,01^(−100) = 3,697112 V ; real: 10 · e⁻¹ = 3,678794 V (0,5 %)
    const r = ok(
      solveTransient(
        {
          nodeCount: 1,
          elements: [
            {
              type: 'capacitor',
              id: 'C1',
              nodeA: 1,
              nodeB: 0,
              capacitance: 1e-6,
              initialVoltage: 10,
            },
            { type: 'resistor', id: 'R1', nodeA: 1, nodeB: 0, resistance: 1000 },
          ],
        },
        { step: 1e-5, duration: 1e-3 },
      ),
    )
    const c = wave(r, 'C1')
    expect(c.voltage[0]).toBe(10)
    expectRel(c.voltage[100], 3.697112, 1e-6)
    expectRel(c.voltage[100], 10 * Math.exp(-1), 6e-3)
    // A corrente no condensador é negativa (sai pelo +): i(0) = −10 V / 1 kΩ = −10 mA
    expectRel(c.current[0], -0.01, 1e-6)
  })

  it('carga através de um díodo: R, díodo e C levam a mesma corrente; u(C) sobe sem passar 5 V', () => {
    //   V1 = 5 V ── R1 1 kΩ ── D1 (1N4148) ── C1 1 µF ── GND
    //   O díodo deixa passar enquanto 5 − u(C) > ≈ 0,5 V; depois a corrente fica muito pequena.
    const r = ok(
      solveTransient(
        {
          nodeCount: 3,
          elements: [
            { type: 'voltage-source', id: 'V1', plus: 1, minus: 0, voltage: 5 },
            { type: 'resistor', id: 'R1', nodeA: 1, nodeB: 2, resistance: 1000 },
            {
              type: 'diode',
              id: 'D1',
              anode: 2,
              cathode: 3,
              saturationCurrent: 2.52e-9,
              emissionCoefficient: 1.752,
            },
            { type: 'capacitor', id: 'C1', nodeA: 3, nodeB: 0, capacitance: 1e-6 },
          ],
        },
        { step: 1e-5, duration: 1e-2 },
      ),
    )
    const u = wave(r, 'C1').voltage
    for (let k = 1; k < u.length; k++) {
      expect(u[k] ?? NaN).toBeGreaterThanOrEqual((u[k - 1] ?? NaN) - 1e-12) // nunca desce
    }
    const last = u.length - 1
    expect(u[last]).toBeGreaterThan(4.3)
    expect(u[last]).toBeLessThan(5)
    for (const k of [1, 50, last]) {
      expectRel(wave(r, 'D1').current[k], wave(r, 'R1').current[k] ?? NaN, 1e-6)
      expectRel(wave(r, 'C1').current[k], wave(r, 'R1').current[k] ?? NaN, 1e-6)
    }
  })

  it('condensador ligado diretamente a uma fonte de 12 V: carrega logo no 1.º passo', () => {
    //   Sem resistência, a carga é instantânea (corrente "infinita" em t = 0). Em t = 0 o cálculo
    //   exato é impossível (duas fontes de tensão em paralelo: 12 V e 0 V) → usa-se o plano B
    //   (resistência de 1 mΩ) e o resultado continua a existir.
    const r = ok(
      solveTransient(
        {
          nodeCount: 1,
          elements: [
            { type: 'voltage-source', id: 'V1', plus: 1, minus: 0, voltage: 12 },
            { type: 'capacitor', id: 'C1', nodeA: 1, nodeB: 0, capacitance: 1e-6 },
          ],
        },
        { step: 1e-6, duration: 3e-6 },
      ),
    )
    const c = wave(r, 'C1')
    expect(c.voltage[0]).toBe(0)
    expect(c.voltage[1]).toBeCloseTo(12, 9)
    expect(c.voltage[3]).toBeCloseTo(12, 9)
    expect(c.current[3]).toBeCloseTo(0, 9) // carregado: já não passa corrente
  })

  it('sem condensadores nem bobinas: todos os instantes iguais ao DC (12 V / 1 kΩ = 12 mA)', () => {
    const r = ok(
      solveTransient(
        {
          nodeCount: 1,
          elements: [
            { type: 'voltage-source', id: 'V1', plus: 1, minus: 0, voltage: 12 },
            { type: 'resistor', id: 'R1', nodeA: 1, nodeB: 0, resistance: 1000 },
          ],
        },
        { step: 1e-3, duration: 3e-3 },
      ),
    )
    expect(wave(r, 'R1').current).toEqual([0.012, 0.012, 0.012, 0.012])
  })

  it('passo ou duração inválidos, ou passos a mais → erro claro', () => {
    const net = rc(1e-6)
    expect(solveTransient(net, { step: 0, duration: 1 })).toMatchObject({
      ok: false,
      error: { code: 'invalid-options' },
    })
    expect(
      solveTransient(net, { step: 1e-9, duration: (MAX_TRANSIENT_STEPS + 1) * 1e-9 }),
    ).toMatchObject({ ok: false, error: { code: 'invalid-options' } })
    expect(
      solveTransient(
        {
          nodeCount: 1,
          elements: [{ type: 'capacitor', id: 'C1', nodeA: 1, nodeB: 0, capacitance: 0 }],
        },
        { step: 1, duration: 1 },
      ),
    ).toMatchObject({ ok: false, error: { code: 'invalid-netlist', elementId: 'C1' } })
  })

  it('o solver DC recusa condensadores (mandam usar o transitório)', async () => {
    const { solveDc } = await import('./mna')
    const s = solveDc({
      nodeCount: 1,
      elements: [{ type: 'capacitor', id: 'C1', nodeA: 1, nodeB: 0, capacitance: 1e-6 }],
    })
    expect(s.ok).toBe(false)
    if (!s.ok) expect(s.error.message).toContain('solveTransient')
  })
})
