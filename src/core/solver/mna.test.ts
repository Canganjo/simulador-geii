import { describe, expect, it } from 'vitest'
import type { Netlist } from '../netlist'
import { solveDc, type DcSolution, type ElementResult } from './mna'

/** Tolerância: 9 casas decimais (nV, nA, nW). */
const DIGITS = 9

function expectOk(solution: DcSolution) {
  if (!solution.ok) throw new Error(`esperava solução, obtive erro: ${solution.error.message}`)
  return solution
}

function result(solution: ReturnType<typeof expectOk>, id: string): ElementResult {
  const r = solution.elements.get(id)
  if (!r) throw new Error(`sem resultado para ${id}`)
  return r
}

/** Conservação da energia: a soma das potências (convenção recetor) tem de dar 0. */
function totalPower(solution: ReturnType<typeof expectOk>): number {
  let sum = 0
  for (const r of solution.elements.values()) sum += r.power
  return sum
}

describe('solveDc — circuitos de referência calculados à mão', () => {
  it('a) divisor de tensão: 12 V, R1 = 1 kΩ em cima, R2 = 2 kΩ em baixo', () => {
    //   N1 ──R1 (1 kΩ)── N2 ──R2 (2 kΩ)── GND
    //   V1 = 12 V entre N1 (+) e GND (−)
    //
    // Cálculo à mão:
    //   R_total = R1 + R2 = 1000 + 2000 = 3000 Ω
    //   I = U / R_total = 12 / 3000 = 0,004 A = 4 mA
    //   V(N2) = U · R2 / (R1 + R2) = 12 · 2000 / 3000 = 8 V
    //   U_R1 = 12 − 8 = 4 V ;  U_R2 = 8 V
    //   P_R1 = 4 · 0,004 = 16 mW ; P_R2 = 8 · 0,004 = 32 mW
    //   P_V1 = −12 · 0,004 = −48 mW (fornece)  → soma = 0
    const netlist: Netlist = {
      nodeCount: 2,
      elements: [
        { type: 'voltage-source', id: 'V1', plus: 1, minus: 0, voltage: 12 },
        { type: 'resistor', id: 'R1', nodeA: 1, nodeB: 2, resistance: 1000 },
        { type: 'resistor', id: 'R2', nodeA: 2, nodeB: 0, resistance: 2000 },
      ],
    }

    const s = expectOk(solveDc(netlist))

    expect(s.nodeVoltages[0]).toBe(0)
    expect(s.nodeVoltages[1]).toBeCloseTo(12, DIGITS)
    expect(s.nodeVoltages[2]).toBeCloseTo(8, DIGITS) // nó do meio = 8 V

    expect(result(s, 'R1').current).toBeCloseTo(0.004, DIGITS) // 4 mA
    expect(result(s, 'R2').current).toBeCloseTo(0.004, DIGITS)
    expect(result(s, 'V1').current).toBeCloseTo(0.004, DIGITS) // a fonte fornece 4 mA

    expect(result(s, 'R1').voltage).toBeCloseTo(4, DIGITS)
    expect(result(s, 'R2').voltage).toBeCloseTo(8, DIGITS)

    expect(result(s, 'R1').power).toBeCloseTo(0.016, DIGITS)
    expect(result(s, 'R2').power).toBeCloseTo(0.032, DIGITS)
    expect(result(s, 'V1').power).toBeCloseTo(-0.048, DIGITS)
    expect(totalPower(s)).toBeCloseTo(0, DIGITS)
  })

  it('b) duas resistências de 1 kΩ em paralelo sob 10 V', () => {
    //   N1 ──┬── R1 (1 kΩ) ──┬── GND
    //        └── R2 (1 kΩ) ──┘
    //   V1 = 10 V entre N1 (+) e GND (−)
    //
    // Cálculo à mão:
    //   R_eq = (1000 · 1000) / (1000 + 1000) = 500 Ω
    //   I_total = 10 / 500 = 0,02 A = 20 mA
    //   I_R1 = I_R2 = 10 / 1000 = 10 mA  (e 10 + 10 = 20 mA, lei dos nós)
    //   P_total = 10 · 0,02 = 200 mW
    const netlist: Netlist = {
      nodeCount: 1,
      elements: [
        { type: 'voltage-source', id: 'V1', plus: 1, minus: 0, voltage: 10 },
        { type: 'resistor', id: 'R1', nodeA: 1, nodeB: 0, resistance: 1000 },
        { type: 'resistor', id: 'R2', nodeA: 1, nodeB: 0, resistance: 1000 },
      ],
    }

    const s = expectOk(solveDc(netlist))

    expect(s.nodeVoltages[1]).toBeCloseTo(10, DIGITS)
    expect(result(s, 'V1').current).toBeCloseTo(0.02, DIGITS) // corrente total = 20 mA
    expect(result(s, 'R1').current).toBeCloseTo(0.01, DIGITS)
    expect(result(s, 'R2').current).toBeCloseTo(0.01, DIGITS)
    expect(result(s, 'V1').power).toBeCloseTo(-0.2, DIGITS)
    expect(totalPower(s)).toBeCloseTo(0, DIGITS)
  })

  it('fonte ligada ao contrário dá tensões negativas', () => {
    // V1 = 5 V com o + no GND e o − em N1 → V(N1) = −5 V
    // R1 = 1 kΩ entre N1 e GND → I(N1→GND) = −5 / 1000 = −5 mA
    const s = expectOk(
      solveDc({
        nodeCount: 1,
        elements: [
          { type: 'voltage-source', id: 'V1', plus: 0, minus: 1, voltage: 5 },
          { type: 'resistor', id: 'R1', nodeA: 1, nodeB: 0, resistance: 1000 },
        ],
      }),
    )
    expect(s.nodeVoltages[1]).toBeCloseTo(-5, DIGITS)
    expect(result(s, 'R1').current).toBeCloseTo(-0.005, DIGITS)
    expect(result(s, 'V1').current).toBeCloseTo(0.005, DIGITS) // continua a fornecer
  })
})

describe('solveDc — erros', () => {
  it('nó solto (resistência pendurada sem caminho para o GND) → matriz singular', () => {
    // N2 só está ligado a R2, que liga a N3, que não está ligado a mais nada:
    // a tensão de N2/N3 não tem valor definido.
    const s = solveDc({
      nodeCount: 3,
      elements: [
        { type: 'voltage-source', id: 'V1', plus: 1, minus: 0, voltage: 12 },
        { type: 'resistor', id: 'R1', nodeA: 1, nodeB: 0, resistance: 1000 },
        { type: 'resistor', id: 'R2', nodeA: 2, nodeB: 3, resistance: 1000 },
      ],
    })
    expect(s.ok).toBe(false)
    if (s.ok) return
    expect(s.error.code).toBe('singular-matrix')
  })

  it('duas fontes de tensão diferentes em paralelo → matriz singular', () => {
    const s = solveDc({
      nodeCount: 1,
      elements: [
        { type: 'voltage-source', id: 'V1', plus: 1, minus: 0, voltage: 12 },
        { type: 'voltage-source', id: 'V2', plus: 1, minus: 0, voltage: 5 },
      ],
    })
    expect(s.ok).toBe(false)
    if (s.ok) return
    expect(s.error.code).toBe('singular-matrix')
  })

  it.each([0, -100, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejeita resistência inválida (%s Ω)',
    (resistance) => {
      const s = solveDc({
        nodeCount: 1,
        elements: [
          { type: 'voltage-source', id: 'V1', plus: 1, minus: 0, voltage: 12 },
          { type: 'resistor', id: 'R1', nodeA: 1, nodeB: 0, resistance },
        ],
      })
      expect(s.ok).toBe(false)
      if (s.ok) return
      expect(s.error).toMatchObject({ code: 'invalid-netlist', elementId: 'R1' })
    },
  )

  it('rejeita um nó fora do intervalo', () => {
    const s = solveDc({
      nodeCount: 1,
      elements: [{ type: 'resistor', id: 'R1', nodeA: 1, nodeB: 7, resistance: 1000 }],
    })
    expect(s.ok).toBe(false)
    if (s.ok) return
    expect(s.error.code).toBe('invalid-netlist')
  })
})

/**
 * Tolerância relativa aceite na folha "Testes de referência" da planilha (célula C2 = 0,001 = 0,1 %).
 * Verifica |valor − teórico| / |teórico| ≤ tolerância.
 */
const REFERENCE_TOLERANCE = 0.001

function expectRelative(actual: number, theoretical: number, tolerance = REFERENCE_TOLERANCE) {
  const relativeError = Math.abs(actual - theoretical) / Math.abs(theoretical)
  expect(
    relativeError,
    `valor ${actual}, teórico ${theoretical}, erro relativo ${(relativeError * 100).toFixed(4)} %`,
  ).toBeLessThanOrEqual(tolerance)
}

describe('Testes de referência (folha "Testes de referência" da planilha)', () => {
  // Circuitos 1, 2 e 5: divisor de tensão 12 V, R1 = 1 kΩ (em cima), R2 = 2 kΩ (em baixo)
  const divider: Netlist = {
    nodeCount: 2,
    elements: [
      { type: 'voltage-source', id: 'V1', plus: 1, minus: 0, voltage: 12 },
      { type: 'resistor', id: 'R1', nodeA: 1, nodeB: 2, resistance: 1000 },
      { type: 'resistor', id: 'R2', nodeA: 2, nodeB: 0, resistance: 2000 },
    ],
  }

  // Circuitos 3 e 4: duas resistências de 1 kΩ em paralelo sob 10 V
  const parallel: Netlist = {
    nodeCount: 1,
    elements: [
      { type: 'voltage-source', id: 'V1', plus: 1, minus: 0, voltage: 10 },
      { type: 'resistor', id: 'R1', nodeA: 1, nodeB: 0, resistance: 1000 },
      { type: 'resistor', id: 'R2', nodeA: 1, nodeB: 0, resistance: 1000 },
    ],
  }

  it('1 — divisor 12 V: tensão no nó do meio = 8 V', () => {
    // V(N2) = U · R2 / (R1 + R2) = 12 · 2000 / 3000 = 8 V
    const s = expectOk(solveDc(divider))
    expectRelative(s.nodeVoltages[2], 8)
  })

  it('2 — divisor 12 V: corrente = 4 mA', () => {
    // I = U / (R1 + R2) = 12 / 3000 = 0,004 A
    const s = expectOk(solveDc(divider))
    expectRelative(result(s, 'R1').current, 0.004)
    expectRelative(result(s, 'V1').current, 0.004) // a mesma corrente sai da fonte
  })

  it('3 — paralelo 1 kΩ ∥ 1 kΩ sob 10 V: corrente total = 20 mA', () => {
    // I_total = I_R1 + I_R2 = 10/1000 + 10/1000 = 0,02 A (lei dos nós)
    const s = expectOk(solveDc(parallel))
    expectRelative(result(s, 'V1').current, 0.02)
  })

  it('4 — paralelo 1 kΩ ∥ 1 kΩ sob 10 V: resistência equivalente = 500 Ω', () => {
    // À mão:  1/Req = 1/R1 + 1/R2 = 1/1000 + 1/1000 = 2/1000  →  Req = 500 Ω
    //         (ou Req = R1·R2 / (R1 + R2) = 1 000 000 / 2000 = 500 Ω)
    // Simulador: Req = V / I_total, com I_total = corrente fornecida pela fonte
    //         = 10 V / 0,02 A = 500 Ω
    const s = expectOk(solveDc(parallel))
    const v = result(s, 'V1').voltage
    const iTotal = result(s, 'V1').current
    expectRelative(v / iTotal, 500)
  })

  it('5 — série 12 V, R1 + R2: potência em R2 = 32 mW', () => {
    // P_R2 = R2 · I² = 2000 · 0,004² = 0,032 W   (ou U_R2 · I = 8 · 0,004)
    const s = expectOk(solveDc(divider))
    expectRelative(result(s, 'R2').power, 0.032)
  })

  // O teste 7 (interruptor aberto → 0 A) está em src/core/netlist/buildNetlist.test.ts,
  // porque o interruptor é traduzido na passagem projeto → netlist.
  // Ainda não testável: o LED chega com a issue #17.
  it.todo('6 — demo 12 V + R1 = 470 Ω + LED (Vf = 2 V): corrente no LED = 21,28 mA')
})
