import { describe, expect, it } from 'vitest'
import type { DiodeElement, Netlist } from '../netlist'
import { solveDc, type DcSolution, type ElementResult } from './mna'
import {
  diodeCurrent,
  GMIN,
  limitJunction,
  MAX_ITERATIONS,
  solveDcNonlinear,
  THERMAL_VOLTAGE,
} from './newton'

/**
 * Díodo 1N4148 (valores típicos dos modelos SPICE): Is = 2,52 nA, n = 1,752.
 * n·Vt = 1,752 × 0,025852 V = 0,045293 V.
 *
 * COMO SE CALCULA À MÃO (díodo em série com R, fonte E):
 *   lei das malhas:  E = R·I + U      e   díodo:  U = n·Vt · ln(I/Is + 1)
 *   Não há fórmula direta, mas na calculadora basta repetir (iteração de ponto fixo):
 *     começar com U = 0,6 V → I = (E − U)/R → U = n·Vt · ln(I/Is + 1) → I = … até estabilizar.
 */
const IS = 2.52e-9
const N = 1.752

function diode(id: string, anode: number, cathode: number): DiodeElement {
  return { type: 'diode', id, anode, cathode, saturationCurrent: IS, emissionCoefficient: N }
}

function expectOk(solution: DcSolution) {
  if (!solution.ok) throw new Error(`esperava solução, obtive erro: ${solution.error.message}`)
  return solution
}

function result(solution: ReturnType<typeof expectOk>, id: string): ElementResult {
  const r = solution.elements.get(id)
  if (!r) throw new Error(`sem resultado para ${id}`)
  return r
}

/** Erro relativo ≤ 1e-5 (o cálculo à mão foi feito com 7 algarismos). */
function expectRelClose(actual: number, expected: number) {
  expect(Math.abs(actual - expected) / Math.abs(expected)).toBeLessThan(1e-5)
}

/** Conservação da energia: a soma das potências (convenção recetor) tem de dar 0. */
function totalPower(solution: ReturnType<typeof expectOk>): number {
  let sum = 0
  for (const r of solution.elements.values()) sum += r.power
  return sum
}

describe('fonte de corrente no MNA (linear)', () => {
  it('1 mA a entrar num nó com 1 kΩ para o GND → 1 V', () => {
    //   J = 1 mA do GND para N1 (através da fonte) ; R = 1 kΩ entre N1 e GND
    //   KCL em N1: J = V1 / R → V1 = 0,001 × 1000 = 1 V
    //   P(R) = 1 V × 1 mA = 1 mW ; P(J) = U·J com U = V(GND) − V(N1) = −1 V → −1 mW (fornece)
    const s = expectOk(
      solveDc({
        nodeCount: 1,
        elements: [
          { type: 'current-source', id: 'J1', from: 0, to: 1, current: 0.001 },
          { type: 'resistor', id: 'R1', nodeA: 1, nodeB: 0, resistance: 1000 },
        ],
      }),
    )
    expect(s.nodeVoltages[1]).toBeCloseTo(1, 12)
    expect(result(s, 'J1').power).toBeCloseTo(-0.001, 12)
    expect(totalPower(s)).toBeCloseTo(0, 12)
  })

  it('o solver linear recusa um díodo e manda usar o Newton-Raphson', () => {
    const s = solveDc({ nodeCount: 1, elements: [diode('D1', 1, 0)] })
    expect(s.ok).toBe(false)
    if (!s.ok) expect(s.error.message).toContain('solveDcNonlinear')
  })
})

describe('equação de Shockley', () => {
  it('Vt a 300 K = k·T/q ≈ 25,852 mV', () => {
    // 1,380649e-23 × 300 / 1,602176634e-19 = 0,0258520 V
    expect(THERMAL_VOLTAGE).toBeCloseTo(0.025852, 6)
  })

  it('a 0 V não passa corrente; em inverso passa só −Is', () => {
    const d = diode('D1', 1, 0)
    expect(diodeCurrent(d, 0)).toBe(0)
    // U = −1 V: e^(−1/0,045293) ≈ 2,6e-10 ≈ 0 → I ≈ −Is − GMIN × 1 V
    expect(diodeCurrent(d, -1)).toBeCloseTo(-IS - GMIN, 15)
  })

  it('a 0,650463 V passa 4,349537 mA (o ponto do primeiro circuito)', () => {
    // I = 2,52e-9 × (e^(0,650463 / 0,045293) − 1) = 2,52e-9 × 1,726007e6 = 4,349537e-3 A
    expectRelClose(diodeCurrent(diode('D1', 1, 0), 0.650463), 4.349537e-3)
  })
})

describe('solveDcNonlinear — circuitos calculados à mão', () => {
  it('sem díodos dá exatamente o mesmo que solveDc, numa só passagem', () => {
    const netlist: Netlist = {
      nodeCount: 1,
      elements: [
        { type: 'voltage-source', id: 'V1', plus: 1, minus: 0, voltage: 12 },
        { type: 'resistor', id: 'R1', nodeA: 1, nodeB: 0, resistance: 1000 },
      ],
    }
    const s = solveDcNonlinear(netlist)
    expect(s.iterations).toBe(1)
    expect(s).toMatchObject(solveDc(netlist))
  })

  it('5 V + 1 kΩ + díodo direto → U = 0,6505 V, I = 4,3495 mA', () => {
    //   N1 ──R1 (1 kΩ)── N2 ──D1 (ânodo → cátodo)── GND ; V1 = 5 V em N1
    //   À mão (n·Vt = 0,045293 V, Is = 2,52 nA):
    //     U = 0,6     → I = (5 − 0,6)/1000      = 4,400000 mA
    //     I = 4,4 mA  → U = 0,045293 · ln(4,4e-3/2,52e-9 + 1) = 0,650986 V → I = 4,349014 mA
    //                 → U = 0,650458 V → I = 4,349542 mA
    //                 → U = 0,650463 V → I = 4,349537 mA   (estável)
    const s = solveDcNonlinear({
      nodeCount: 2,
      elements: [
        { type: 'voltage-source', id: 'V1', plus: 1, minus: 0, voltage: 5 },
        { type: 'resistor', id: 'R1', nodeA: 1, nodeB: 2, resistance: 1000 },
        diode('D1', 2, 0),
      ],
    })
    const ok = expectOk(s)
    expectRelClose(result(ok, 'D1').voltage, 0.650463)
    expectRelClose(result(ok, 'D1').current, 4.349537e-3)
    expectRelClose(result(ok, 'R1').current, 4.349537e-3)
    expectRelClose(result(ok, 'V1').current, 4.349537e-3) // fornecida pela fonte
    // P(D1) = 0,650463 × 4,349537e-3 = 2,829213 mW
    expectRelClose(result(ok, 'D1').power, 2.829213e-3)
    expect(totalPower(ok)).toBeCloseTo(0, 12)
    // Os elementos internos do Newton (D1#g, D1#ieq) não aparecem nos resultados.
    expect([...ok.elements.keys()].sort()).toEqual(['D1', 'R1', 'V1'])
    expect(s.iterations).toBeLessThan(30)
  })

  it('díodo ao contrário (inverso) → bloqueado: U ≈ −5 V e I ≈ −Is (praticamente 0)', () => {
    //   Mesmo circuito com o díodo virado: o cátodo está do lado da fonte.
    //   I ≈ −Is − GMIN·5 V ≈ −2,5e-9 A → queda em R1 = 2,5 µV → U(D1) ≈ −5 V
    const ok = expectOk(
      solveDcNonlinear({
        nodeCount: 2,
        elements: [
          { type: 'voltage-source', id: 'V1', plus: 1, minus: 0, voltage: 5 },
          { type: 'resistor', id: 'R1', nodeA: 1, nodeB: 2, resistance: 1000 },
          diode('D1', 0, 2),
        ],
      }),
    )
    expect(result(ok, 'D1').voltage).toBeCloseTo(-5, 4)
    expect(result(ok, 'D1').current).toBeCloseTo(-IS - GMIN * 5, 12)
    expect(Math.abs(result(ok, 'R1').current)).toBeLessThan(1e-8)
  })

  it('dois díodos em série → U total = 1,2866 V, I = 3,7134 mA', () => {
    //   V1 = 5 V ── R1 1 kΩ ── D1 ── D2 ── GND  (díodos iguais → cada um tem metade)
    //   À mão: E = R·I + 2 · n·Vt · ln(I/Is + 1)
    //     U = 1,2 → I = 3,8 mA → U = 2 · 0,045293 · ln(3,8e-3/2,52e-9 + 1) = 1,288691 V
    //     → I = 3,711309 mA → U = 1,286552 → I = 3,713448 mA → U = 1,286604 → I = 3,713396 mA
    //     → U = 1,286603 V, I = 3,713397 mA (estável)
    const ok = expectOk(
      solveDcNonlinear({
        nodeCount: 3,
        elements: [
          { type: 'voltage-source', id: 'V1', plus: 1, minus: 0, voltage: 5 },
          { type: 'resistor', id: 'R1', nodeA: 1, nodeB: 2, resistance: 1000 },
          diode('D1', 2, 3),
          diode('D2', 3, 0),
        ],
      }),
    )
    expectRelClose(result(ok, 'R1').current, 3.713397e-3)
    expectRelClose(result(ok, 'D1').voltage + result(ok, 'D2').voltage, 1.286603)
    expectRelClose(result(ok, 'D1').voltage, 1.286603 / 2)
    expect(totalPower(ok)).toBeCloseTo(0, 12)
  })

  it('fonte grande (100 V, 10 Ω) a partir de 0 V: converge sem "explodir" → U = 1,0006 V', () => {
    //   Sem limitar o salto, a 1.ª iteração daria U ≈ 100 V e e^(100/0,045) = infinito.
    //   À mão: U = 0,6 → I = 9,94 A → U = 0,045293 · ln(9,94/2,52e-9 + 1) = 1,000768 V
    //          → I = 9,899923 A → U = 1,000585 V → I = 9,899941 A (estável)
    const s = solveDcNonlinear({
      nodeCount: 2,
      elements: [
        { type: 'voltage-source', id: 'V1', plus: 1, minus: 0, voltage: 100 },
        { type: 'resistor', id: 'R1', nodeA: 1, nodeB: 2, resistance: 10 },
        diode('D1', 2, 0),
      ],
    })
    const ok = expectOk(s)
    expectRelClose(result(ok, 'D1').voltage, 1.000585)
    expectRelClose(result(ok, 'D1').current, 9.899941)
    expect(Number.isFinite(totalPower(ok))).toBe(true)
    expect(s.iterations).toBeLessThan(MAX_ITERATIONS)
  })

  it('díodo com Is inválido → erro claro, sem cálculo', () => {
    const s = solveDcNonlinear({
      nodeCount: 1,
      elements: [{ ...diode('D1', 1, 0), saturationCurrent: 0 }],
    })
    expect(s.ok).toBe(false)
    if (!s.ok) expect(s.error).toMatchObject({ code: 'invalid-netlist', elementId: 'D1' })
  })
})

describe('limitJunction (pnjlim do SPICE)', () => {
  const d = diode('D1', 1, 0)

  it('abaixo da tensão crítica (≈ 0,74 V) não mexe no valor', () => {
    // Vcrit = n·Vt · ln(n·Vt / (√2 · Is)) = 0,045293 · ln(0,045293 / 3,5638e-9) = 0,7425 V
    expect(limitJunction(d, 0.7, 0)).toBe(0.7)
    expect(limitJunction(d, -50, 0)).toBe(-50)
  })

  it('um salto grande para cima vira um salto pequeno (logarítmico)', () => {
    // De 0 V para 100 V: U = n·Vt · ln(100 / n·Vt) = 0,045293 · ln(2207,9) = 0,3487 V
    expect(limitJunction(d, 100, 0)).toBeCloseTo(0.045293 * Math.log(100 / 0.045293), 4)
    // De 0,7 V para 5 V: U = 0,7 + n·Vt · ln(1 + 4,3 / n·Vt) = 0,7 + 0,045293 · ln(95,94) = 0,9067 V
    expect(limitJunction(d, 5, 0.7)).toBeCloseTo(0.7 + 0.045293 * Math.log(1 + 4.3 / 0.045293), 4)
  })
})
