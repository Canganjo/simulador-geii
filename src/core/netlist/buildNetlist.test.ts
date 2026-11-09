import { describe, expect, it } from 'vitest'
import { createComponent } from '../library'
import type { Component, ComponentKind, ComponentParamsByKind, TerminalId, Wire } from '../model'
import { solveDc, type DcSolution, type ElementResult } from '../solver/mna'
import { buildNetlist, CLOSED_SWITCH_RESISTANCE } from './buildNetlist'

// ─── Ajudas para montar circuitos legíveis ──────────────────────────────────────────────────

/** Cria um componente com ID = nome (R1, V1…), para ler os terminais como "R1:a". */
function part<K extends ComponentKind>(
  list: Component[],
  kind: K,
  params: Partial<ComponentParamsByKind[K]> = {},
): Component {
  const c = createComponent(kind, { x: 0, y: 0 }, { existing: list, newId: () => '' })
  const id = c.name
  const component = {
    ...c,
    id,
    terminals: c.terminals.map((t) => ({ ...t, id: `${id}:${t.name}`, componentId: id })),
    params: { ...c.params, ...params },
  } as Component
  list.push(component)
  return component
}

let wireCount = 0
const wire = (from: TerminalId, to: TerminalId): Wire => ({ id: `w${++wireCount}`, from, to })

/** Projeto → netlist → solver. Falha o teste se algum passo não correr bem. */
function simulate(components: Component[], wires: Wire[]) {
  const built = buildNetlist({ components, wires })
  if (!built.ok) throw new Error(`buildNetlist falhou: ${built.reason}`)
  const solution: DcSolution = solveDc(built.netlist)
  if (!solution.ok) throw new Error(`solveDc falhou: ${solution.error.message}`)
  const at = (terminal: TerminalId): number => {
    const node = built.nodeOfTerminal.get(terminal)
    if (node === undefined) throw new Error(`terminal ${terminal} sem nó`)
    return solution.nodeVoltages[node] ?? Number.NaN
  }
  const of = (id: string): ElementResult => {
    const r = solution.elements.get(id)
    if (!r) throw new Error(`sem resultado para ${id}`)
    return r
  }
  return { built, solution, at, of }
}

/** Tolerância da folha "Testes de referência" da planilha: 0,1 %. */
function expectRelative(actual: number, theoretical: number, tolerance = 0.001) {
  expect(Math.abs(actual - theoretical) / Math.abs(theoretical)).toBeLessThanOrEqual(tolerance)
}

// ─── Circuitos ──────────────────────────────────────────────────────────────────────────────

/** Divisor da planilha: 12 V, R1 = 1 kΩ em cima, R2 = 2 kΩ em baixo. */
function divider() {
  //   V1+ ── R1 ──●── R2 ──┐
  //   V1− ─────────────────┴── GND1
  const c: Component[] = []
  part(c, 'dc-source', { voltage: 12 })
  part(c, 'resistor', { resistance: 1000 })
  part(c, 'resistor', { resistance: 2000 })
  part(c, 'ground')
  const w = [
    wire('V1:+', 'R1:a'),
    wire('R1:b', 'R2:a'),
    wire('R2:b', 'GND1:gnd'),
    wire('V1:-', 'GND1:gnd'),
  ]
  return { c, w }
}

describe('buildNetlist — tradução dos componentes', () => {
  it('divisor: 1 fonte + 2 resistências, 2 nós além do GND', () => {
    const { c, w } = divider()
    const built = buildNetlist({ components: c, wires: w })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.netlist.nodeCount).toBe(2) // grafo: 3 nós (0, 1, 2) → netlist não conta o GND
    expect(built.netlist.elements).toEqual([
      { type: 'voltage-source', id: 'V1', plus: 1, minus: 0, voltage: 12 },
      { type: 'resistor', id: 'R1', nodeA: 1, nodeB: 2, resistance: 1000 },
      { type: 'resistor', id: 'R2', nodeA: 2, nodeB: 0, resistance: 2000 },
    ])
    expect(built.skipped).toEqual([])
  })

  it('lâmpada 12 V / 1 W → resistência de 144 Ω (R = U² / P = 144 / 1)', () => {
    const c: Component[] = []
    part(c, 'lamp')
    part(c, 'ground')
    const built = buildNetlist({ components: c, wires: [wire('L1:b', 'GND1:gnd')] })
    if (!built.ok) throw new Error('falhou')
    const lamp = built.netlist.elements.find((e) => e.id === 'L1')
    expect(lamp?.type === 'resistor' && lamp.resistance).toBeCloseTo(144, 9)
  })

  it('interruptor fechado → resistência de 1 mΩ; aberto → fica de fora', () => {
    const c: Component[] = []
    part(c, 'switch', { closed: true })
    part(c, 'switch', { closed: false })
    part(c, 'ground')
    const built = buildNetlist({
      components: c,
      wires: [wire('S1:b', 'GND1:gnd'), wire('S2:b', 'GND1:gnd')],
    })
    if (!built.ok) throw new Error('falhou')
    expect(built.netlist.elements).toEqual([
      { type: 'resistor', id: 'S1', nodeA: 1, nodeB: 0, resistance: CLOSED_SWITCH_RESISTANCE },
    ])
    expect(built.skipped).toEqual([{ componentId: 'S2', name: 'S2', reason: 'open-switch' }])
  })

  it('LED a conduzir com Rs = 0 → só uma fonte Vf do ânodo para o cátodo', () => {
    //   D1:ânodo (nó 1) ── (+ 2 V −) ── D1:cátodo ── GND1 (nó 0)
    const c: Component[] = []
    part(c, 'led')
    part(c, 'ground')
    const built = buildNetlist({ components: c, wires: [wire('D1:catodo', 'GND1:gnd')] })
    if (!built.ok) throw new Error('falhou')
    expect(built.netlist.elements).toEqual([
      { type: 'voltage-source', id: 'D1#vf', plus: 1, minus: 0, voltage: 2 },
    ])
  })

  it('LED a conduzir com Rs = 10 Ω → resistência + fonte, com um nó interno', () => {
    //   D1:ânodo (nó 1) ── Rs 10 Ω ── nó interno (2) ── (+ 2 V −) ── D1:cátodo ── GND1 (nó 0)
    const c: Component[] = []
    part(c, 'led', { seriesResistance: 10 })
    part(c, 'ground')
    const built = buildNetlist({ components: c, wires: [wire('D1:catodo', 'GND1:gnd')] })
    if (!built.ok) throw new Error('falhou')
    expect(built.netlist.nodeCount).toBe(2)
    expect(built.netlist.elements).toEqual([
      { type: 'resistor', id: 'D1#rs', nodeA: 1, nodeB: 2, resistance: 10 },
      { type: 'voltage-source', id: 'D1#vf', plus: 2, minus: 0, voltage: 2 },
    ])
  })

  it('LED bloqueado (ledOff) → fica de fora, como um interruptor aberto', () => {
    const c: Component[] = []
    part(c, 'led')
    part(c, 'ground')
    const built = buildNetlist({ components: c, wires: [] }, { ledOff: new Set(['D1']) })
    if (!built.ok) throw new Error('falhou')
    expect(built.netlist.elements).toEqual([])
    expect(built.skipped).toEqual([{ componentId: 'D1', name: 'D1', reason: 'led-off' }])
  })

  it('sem GND → erro "no-ground"', () => {
    const c: Component[] = []
    part(c, 'dc-source')
    part(c, 'resistor')
    const result = buildNetlist({ components: c, wires: [wire('V1:+', 'R1:a')] })
    expect(result).toEqual({ ok: false, reason: 'no-ground' })
  })

  it('nós sem nenhum elemento são retirados e os outros renumerados 1, 2…', () => {
    //   V1+ ── R1:a   R1:b ── S1:a   S1 aberto   S1:b (só liga ao interruptor)
    //   V1− ── GND1
    // Grafo: nós 0, 1 (V1+, R1:a), 2 (R1:b, S1:a), 3 (S1:b). O nó 3 não toca em nenhum
    // elemento → sai da netlist (senão a matriz teria uma linha de zeros).
    const c: Component[] = []
    part(c, 'dc-source')
    part(c, 'resistor')
    part(c, 'switch', { closed: false })
    part(c, 'ground')
    const built = buildNetlist({
      components: c,
      wires: [wire('V1:+', 'R1:a'), wire('R1:b', 'S1:a'), wire('V1:-', 'GND1:gnd')],
    })
    if (!built.ok) throw new Error('falhou')
    expect(built.netlist.nodeCount).toBe(2)
    expect(built.nodeOfTerminal.get('S1:b')).toBeUndefined()
    expect(built.nodeOfTerminal.get('S1:a')).toBe(2)
  })
})

describe('Testes de referência a partir de um projeto (planilha, tolerância 0,1 %)', () => {
  it('1 — divisor 12 V: tensão no ponto do meio = 8 V', () => {
    // V = U · R2 / (R1 + R2) = 12 · 2000 / 3000 = 8 V
    const { c, w } = divider()
    expectRelative(simulate(c, w).at('R1:b'), 8)
  })

  it('2 — divisor 12 V: corrente = 4 mA', () => {
    // I = U / (R1 + R2) = 12 / 3000 = 0,004 A
    const { c, w } = divider()
    expectRelative(simulate(c, w).of('R1').current, 0.004)
  })

  it('4 — paralelo 1 kΩ ∥ 1 kΩ sob 10 V: Req = 500 Ω', () => {
    //   V1+ ──┬── R1 ──┬── V1− ── GND1
    //         └── R2 ──┘
    // 1/Req = 1/1000 + 1/1000 → Req = 500 Ω ;  simulador: Req = U / I_total = 10 / 0,02
    const c: Component[] = []
    part(c, 'dc-source', { voltage: 10 })
    part(c, 'resistor', { resistance: 1000 })
    part(c, 'resistor', { resistance: 1000 })
    part(c, 'ground')
    const s = simulate(c, [
      wire('V1:+', 'R1:a'),
      wire('V1:+', 'R2:a'),
      wire('R1:b', 'V1:-'),
      wire('R2:b', 'V1:-'),
      wire('V1:-', 'GND1:gnd'),
    ])
    const source = s.of('V1')
    expectRelative(source.voltage / source.current, 500)
  })

  it('lâmpada 12 V / 1 W ligada a 12 V: I = 1/12 = 83,3 mA e P = 1 W', () => {
    // R = 144 Ω ;  I = U / R = 12 / 144 = 0,08333 A ;  P = U · I = 12 · 0,08333 = 1 W
    const c: Component[] = []
    part(c, 'dc-source', { voltage: 12 })
    part(c, 'lamp')
    part(c, 'ground')
    const s = simulate(c, [wire('V1:+', 'L1:a'), wire('L1:b', 'V1:-'), wire('V1:-', 'GND1:gnd')])
    expectRelative(s.of('L1').current, 1 / 12)
    expectRelative(s.of('L1').power, 1)
  })

  /** 12 V + interruptor S1 + R1 = 1 kΩ, em série. */
  function switchCircuit(closed: boolean) {
    //   V1+ ── S1 ── R1 ──┐
    //   V1− ──────────────┴── GND1
    const c: Component[] = []
    part(c, 'dc-source', { voltage: 12 })
    part(c, 'switch', { closed })
    part(c, 'resistor', { resistance: 1000 })
    part(c, 'ground')
    return simulate(c, [
      wire('V1:+', 'S1:a'),
      wire('S1:b', 'R1:a'),
      wire('R1:b', 'GND1:gnd'),
      wire('V1:-', 'GND1:gnd'),
    ])
  }

  it('7 — circuito aberto (interruptor aberto), 12 V + 1 kΩ: corrente = 0 A', () => {
    // Interruptor aberto → não há caminho fechado → I = 0 A (e a fonte não fornece nada)
    const s = switchCircuit(false)
    expect(s.of('R1').current).toBeCloseTo(0, 12)
    expect(s.of('V1').current).toBeCloseTo(0, 12)
  })

  it('interruptor fechado, 12 V + 1 kΩ: corrente ≈ 12 mA', () => {
    // I = 12 / (1000 + 0,001) = 0,0119999… A ≈ 12 mA (a resistência de 1 mΩ é desprezável)
    expectRelative(switchCircuit(true).of('R1').current, 0.012)
  })
})
