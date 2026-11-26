import { describe, expect, it } from 'vitest'
import { createComponent } from '../library'
import type { Component, ComponentKind, ComponentParamsByKind, TerminalId, Wire } from '../model'
import { simulateDc } from '../solver'
import { buildWireFlowModel, wireCurrents } from './wireCurrents'

/** Cria um componente com ID = nome (R1, V1…), para ler os terminais como "R1:a". */
function part<K extends ComponentKind>(
  list: Component[],
  kind: K,
  params: Partial<ComponentParamsByKind[K]> = {},
): void {
  const c = createComponent(kind, { x: 0, y: 0 }, { existing: list, newId: () => '' })
  const id = c.name
  list.push({
    ...c,
    id,
    terminals: c.terminals.map((t) => ({ ...t, id: `${id}:${t.name}`, componentId: id })),
    params: { ...c.params, ...params },
  } as Component)
}

/** Fios com ID "do→para", para os testes se lerem sozinhos. */
const wire = (from: TerminalId, to: TerminalId): Wire => ({ id: `${from}→${to}`, from, to })

/** Simula em DC e devolve a corrente de cada fio, em mA (mais fácil de comparar à mão). */
function currentsMa(components: Component[], wires: Wire[], length?: (w: Wire) => number) {
  const r = simulateDc({ components, wires })
  if (!r.ok) throw new Error(`simulação falhou: ${r.message ?? r.issues[0]?.message}`)
  const amps = wireCurrents({ components, wires }, r.results, { length })
  return (from: TerminalId, to: TerminalId) => {
    const value = amps.get(`${from}→${to}`)
    if (value === undefined) throw new Error(`sem corrente para o fio ${from}→${to}`)
    return value * 1000
  }
}

describe('corrente em cada fio (lei dos nós)', () => {
  it('série: a mesma corrente em todos os fios; o fio do GND não leva nada', () => {
    // V1 = 12 V, R1 = 1 kΩ, R2 = 2 kΩ em série.
    // I = 12 / (1 k + 2 k) = 4 mA, do + da fonte, por R1 e R2, de volta ao −.
    // O GND só fixa os 0 V: com um único GND, a corrente que entra no nó do − é a mesma que
    // sai (4 mA de R2 → 4 mA para o −), por isso o fio do GND leva 0 mA.
    const c: Component[] = []
    part(c, 'dc-source', { voltage: 12 })
    part(c, 'resistor', { resistance: 1000 })
    part(c, 'resistor', { resistance: 2000 })
    part(c, 'ground')
    const w = [
      wire('V1:+', 'R1:a'),
      wire('R1:b', 'R2:a'),
      wire('R2:b', 'V1:-'),
      wire('V1:-', 'GND1:gnd'),
    ]
    const I = currentsMa(c, w)
    expect(I('V1:+', 'R1:a')).toBeCloseTo(4, 6)
    expect(I('R1:b', 'R2:a')).toBeCloseTo(4, 6)
    expect(I('R2:b', 'V1:-')).toBeCloseTo(4, 6)
    expect(I('V1:-', 'GND1:gnd')).toBeCloseTo(0, 6)
  })

  it('o sinal segue o sentido do fio: desenhado ao contrário, a corrente fica negativa', () => {
    // Mesmo circuito, mas o 1.º fio vai de R1:a para V1:+ → −4 mA (de to para from).
    const c: Component[] = []
    part(c, 'dc-source', { voltage: 12 })
    part(c, 'resistor', { resistance: 1000 })
    part(c, 'resistor', { resistance: 2000 })
    part(c, 'ground')
    const w = [
      wire('R1:a', 'V1:+'),
      wire('R1:b', 'R2:a'),
      wire('R2:b', 'V1:-'),
      wire('V1:-', 'GND1:gnd'),
    ]
    expect(currentsMa(c, w)('R1:a', 'V1:+')).toBeCloseTo(-4, 6)
  })

  it('paralelo em cadeia: o fio entre as duas resistências leva só a parte de R2', () => {
    // V1 = 10 V, R1 = R2 = 1 kΩ em paralelo. I(R1) = I(R2) = 10 V / 1 kΩ = 10 mA; total 20 mA.
    // Fios em cadeia: V1+ → R1a → R2a (em cima) e R1b → R2b → V1− (em baixo).
    //   V1+ → R1a: os 20 mA todos.
    //   R1a → R2a: só os 10 mA que vão para R2 (os outros 10 mA ficam em R1).
    //   R1b → R2b: os 10 mA que saem de R1 juntam-se aos de R2 → 10 mA.
    //   R2b → V1−: 10 + 10 = 20 mA de volta à fonte.
    const c: Component[] = []
    part(c, 'dc-source', { voltage: 10 })
    part(c, 'resistor', { resistance: 1000 })
    part(c, 'resistor', { resistance: 1000 })
    part(c, 'ground')
    const w = [
      wire('V1:+', 'R1:a'),
      wire('R1:a', 'R2:a'),
      wire('R1:b', 'R2:b'),
      wire('R2:b', 'V1:-'),
      wire('V1:-', 'GND1:gnd'),
    ]
    const I = currentsMa(c, w)
    expect(I('V1:+', 'R1:a')).toBeCloseTo(20, 6)
    expect(I('R1:a', 'R2:a')).toBeCloseTo(10, 6)
    expect(I('R1:b', 'R2:b')).toBeCloseTo(10, 6)
    expect(I('R2:b', 'V1:-')).toBeCloseTo(20, 6)
  })

  it('ponte de Wheatstone desequilibrada: corrente na ponte R5 e em todos os fios', () => {
    // V1 = 10 V. Ramo esquerdo: R1 = 1 kΩ (em cima), R2 = 2 kΩ (em baixo), ponto do meio M.
    // Ramo direito: R3 = 2 kΩ (em cima), R4 = 1 kΩ (em baixo), ponto do meio N. Ponte R5 = 1 kΩ.
    // Lei dos nós (kΩ e mA):
    //   M: (10 − M)/1 = M/2 + (M − N)/1  → 2,5·M − N = 10
    //   N: (10 − N)/2 = N/1 + (N − M)/1  → 2,5·N − M = 5
    //   → M = 40/7 ≈ 5,714 V, N = 30/7 ≈ 4,286 V.
    //   I(R1) = (10 − 40/7)/1 = 30/7 mA   I(R3) = (10 − 30/7)/2 = 20/7 mA
    //   I(R2) = (40/7)/2      = 20/7 mA   I(R4) = (30/7)/1      = 30/7 mA
    //   I(R5) = (40/7 − 30/7)/1 = 10/7 ≈ 1,429 mA, de M para N.
    //   Total = 30/7 + 20/7 = 50/7 ≈ 7,143 mA.
    const c: Component[] = []
    part(c, 'dc-source', { voltage: 10 })
    part(c, 'resistor', { resistance: 1000 }) // R1
    part(c, 'resistor', { resistance: 2000 }) // R2
    part(c, 'resistor', { resistance: 2000 }) // R3
    part(c, 'resistor', { resistance: 1000 }) // R4
    part(c, 'resistor', { resistance: 1000 }) // R5 (a em M, b em N)
    part(c, 'ground')
    const w = [
      wire('V1:+', 'R1:a'),
      wire('R1:a', 'R3:a'),
      wire('R1:b', 'R2:a'),
      wire('R2:a', 'R5:a'),
      wire('R3:b', 'R4:a'),
      wire('R4:a', 'R5:b'),
      wire('R2:b', 'R4:b'),
      wire('R4:b', 'V1:-'),
      wire('V1:-', 'GND1:gnd'),
    ]
    const I = currentsMa(c, w)
    expect(I('V1:+', 'R1:a')).toBeCloseTo(50 / 7, 6) // tudo o que a fonte dá
    expect(I('R1:a', 'R3:a')).toBeCloseTo(20 / 7, 6) // a parte que vai para R3
    expect(I('R1:b', 'R2:a')).toBeCloseTo(30 / 7, 6) // sai de R1 (30/7) para M
    expect(I('R2:a', 'R5:a')).toBeCloseTo(10 / 7, 6) // de M para a ponte
    expect(I('R3:b', 'R4:a')).toBeCloseTo(20 / 7, 6) // sai de R3 para N
    expect(I('R4:a', 'R5:b')).toBeCloseTo(-10 / 7, 6) // a ponte chega a N: de R5:b para R4:a
    expect(I('R2:b', 'R4:b')).toBeCloseTo(20 / 7, 6) // sai de R2 em baixo
    expect(I('R4:b', 'V1:-')).toBeCloseTo(50 / 7, 6) // 20/7 + 30/7 de volta à fonte
  })

  it('malha só de fios: a corrente divide-se ao contrário do comprimento (como num fio real)', () => {
    // V1 = 10 V, R1 = 1 kΩ → 10 mA. Entre V1+ e R1:a há DOIS fios em paralelo, com
    // comprimentos 1 e 3. A KCL sozinha não decide como os 10 mA se repartem.
    // Divisor de corrente com resistências proporcionais ao comprimento (1 e 3):
    //   curto: 10 · 3/(1 + 3) = 7,5 mA     comprido: 10 · 1/(1 + 3) = 2,5 mA.
    const c: Component[] = []
    part(c, 'dc-source', { voltage: 10 })
    part(c, 'resistor', { resistance: 1000 })
    part(c, 'ground')
    const short: Wire = { id: 'curto', from: 'V1:+', to: 'R1:a' }
    const long: Wire = { id: 'comprido', from: 'V1:+', to: 'R1:a' }
    const wires = [short, long, wire('R1:b', 'V1:-'), wire('V1:-', 'GND1:gnd')]
    const r = simulateDc({ components: c, wires })
    if (!r.ok) throw new Error('simulação falhou')
    const amps = wireCurrents({ components: c, wires }, r.results, {
      length: (w) => (w.id === 'comprido' ? 3 : 1),
    })
    expect((amps.get('curto') ?? 0) * 1000).toBeCloseTo(7.5, 6)
    expect((amps.get('comprido') ?? 0) * 1000).toBeCloseTo(2.5, 6)
  })

  it('dois GND: a corrente que vai para a terra reparte-se pelos dois', () => {
    // V1 = 10 V, R1 = 1 kΩ → 10 mA. O − da fonte vai a GND1 e o b de R1 vai a GND2 (sem fio
    // entre eles). A corrente de R1 só pode voltar à fonte pela terra: 10 mA no fio R1:b → GND2
    // e 10 mA no fio GND1 → V1:− (sentido GND1 → V1−, por isso +10 mA nesse fio).
    const c: Component[] = []
    part(c, 'dc-source', { voltage: 10 })
    part(c, 'resistor', { resistance: 1000 })
    part(c, 'ground')
    part(c, 'ground')
    const w = [wire('V1:+', 'R1:a'), wire('R1:b', 'GND2:gnd'), wire('GND1:gnd', 'V1:-')]
    const I = currentsMa(c, w)
    expect(I('V1:+', 'R1:a')).toBeCloseTo(10, 6)
    expect(I('R1:b', 'GND2:gnd')).toBeCloseTo(10, 6)
    expect(I('GND1:gnd', 'V1:-')).toBeCloseTo(10, 6)
  })

  it('interruptor aberto: 0 A em todos os fios', () => {
    // Circuito aberto → I = 0 (teste de referência 7 da planilha).
    const c: Component[] = []
    part(c, 'dc-source', { voltage: 12 })
    part(c, 'switch', { closed: false })
    part(c, 'resistor', { resistance: 1000 })
    part(c, 'ground')
    const w = [
      wire('V1:+', 'S1:a'),
      wire('S1:b', 'R1:a'),
      wire('R1:b', 'V1:-'),
      wire('V1:-', 'GND1:gnd'),
    ]
    const I = currentsMa(c, w)
    for (const x of w) expect(I(x.from, x.to)).toBeCloseTo(0, 9)
  })

  it('o modelo ignora fios com terminais que não existem', () => {
    const c: Component[] = []
    part(c, 'resistor')
    const model = buildWireFlowModel({
      components: c,
      wires: [{ id: 'mau', from: 'R1:a', to: 'X9:a' }],
    })
    expect(model.wires).toHaveLength(0)
  })
})
