import { describe, expect, it } from 'vitest'
import { createComponent } from '../library'
import type { Component, ComponentKind, ComponentParamsByKind, TerminalId, Wire } from '../model'
import { simulateDc, type ComponentResult, type SimulationResult } from './simulateDc'

/** Cria um componente com ID = nome (R1, V1, D1…), para ler os terminais como "D1:anodo". */
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

let wireCount = 0
const wire = (from: TerminalId, to: TerminalId): Wire => ({ id: `w${++wireCount}`, from, to })

function ok(r: SimulationResult) {
  if (!r.ok) throw new Error(`simulação falhou: ${r.message ?? r.issues[0]?.message}`)
  return r
}
function result(r: SimulationResult, id: string): ComponentResult {
  const x = ok(r).results.get(id)
  if (!x) throw new Error(`sem resultado para ${id}`)
  return x
}

/** Tolerância da folha "Testes de referência" da planilha: 0,1 %. */
function expectRelative(actual: number, theoretical: number, tolerance = 0.001) {
  expect(Math.abs(actual - theoretical) / Math.abs(theoretical)).toBeLessThanOrEqual(tolerance)
}

/** V1 ── R1 ── LED D1 ── GND, com o LED no sentido direto (ou ao contrário). */
function ledCircuit(opts: {
  voltage?: number
  resistance?: number
  led?: Partial<ComponentParamsByKind['led']>
  reversed?: boolean
}) {
  //   direto:      V1+ ── R1 ── D1:ânodo  D1:cátodo ── GND1 ── V1−
  //   ao contrário: V1+ ── R1 ── D1:cátodo D1:ânodo ── GND1 ── V1−
  const c: Component[] = []
  part(c, 'dc-source', { voltage: opts.voltage ?? 12 })
  part(c, 'resistor', { resistance: opts.resistance ?? 470 })
  part(c, 'led', opts.led ?? {})
  part(c, 'ground')
  const [top, bottom] = opts.reversed ? ['D1:catodo', 'D1:anodo'] : ['D1:anodo', 'D1:catodo']
  return simulateDc({
    components: c,
    wires: [
      wire('V1:+', 'R1:a'),
      wire('R1:b', top as TerminalId),
      wire(bottom as TerminalId, 'GND1:gnd'),
      wire('V1:-', 'GND1:gnd'),
    ],
  })
}

describe('simulateDc — LED no modelo simples (Vf + Rs)', () => {
  it('6 — demo 12 V + R1 = 470 Ω + LED (Vf = 2 V): corrente = 21,28 mA (planilha, 0,1 %)', () => {
    // LED a conduzir = fonte de 2 V.  Malha: 12 = 470 · I + 2  →  I = 10 / 470 = 0,021277 A
    const r = ledCircuit({})
    const led = result(r, 'D1')
    expect(led.ledState).toBe('on')
    expectRelative(led.current, 0.0212766)
    expectRelative(led.voltage, 2) // U_LED = Vf
    expectRelative(led.power, 2 * 0.0212766) // P = U · I = 42,55 mW
    expectRelative(result(r, 'R1').current, 0.0212766) // a mesma corrente na resistência
    expectRelative(result(r, 'V1').current, 0.0212766) // e na fonte
  })

  it('com Rs = 10 Ω: I = (12 − 2) / (470 + 10) = 20,83 mA e U_LED = 2 + 10 · I', () => {
    // I = 10 / 480 = 0,0208333 A ;  U_LED = Vf + Rs · I = 2 + 0,208333 = 2,208333 V
    const r = ledCircuit({ led: { seriesResistance: 10 } })
    expectRelative(result(r, 'D1').current, 10 / 480)
    expectRelative(result(r, 'D1').voltage, 2 + 10 * (10 / 480))
  })

  it('LED ao contrário → bloqueado: I = 0 A e U_LED = −12 V', () => {
    // Bloqueado = aberto → não passa corrente na malha → R1 não tem queda de tensão:
    // V(cátodo) = 12 V, V(ânodo) = 0 V  →  U_LED = 0 − 12 = −12 V
    const r = ledCircuit({ reversed: true })
    const led = result(r, 'D1')
    expect(led.ledState).toBe('off')
    expect(led.current).toBe(0)
    expectRelative(led.voltage, -12)
    expect(result(r, 'R1').current).toBeCloseTo(0, 12)
  })

  it('fonte de 1,5 V (menor que Vf = 2 V) → LED bloqueado, I = 0 A', () => {
    // Se conduzisse: I = (1,5 − 2) / 470 < 0 → impossível → bloqueado.
    // Bloqueado: U_LED = 1,5 V < Vf, coerente.
    const r = ledCircuit({ voltage: 1.5 })
    expect(result(r, 'D1').ledState).toBe('off')
    expect(result(r, 'D1').current).toBe(0)
    expectRelative(result(r, 'D1').voltage, 1.5)
  })

  it('dois LED em série: I = (12 − 2 − 2) / 470 = 17,02 mA', () => {
    //   V1+ ── R1 ── D1 ── D2 ── GND1 ── V1−
    const c: Component[] = []
    part(c, 'dc-source', { voltage: 12 })
    part(c, 'resistor', { resistance: 470 })
    part(c, 'led')
    part(c, 'led')
    part(c, 'ground')
    const r = simulateDc({
      components: c,
      wires: [
        wire('V1:+', 'R1:a'),
        wire('R1:b', 'D1:anodo'),
        wire('D1:catodo', 'D2:anodo'),
        wire('D2:catodo', 'GND1:gnd'),
        wire('V1:-', 'GND1:gnd'),
      ],
    })
    expectRelative(result(r, 'D1').current, 8 / 470)
    expectRelative(result(r, 'D2').current, 8 / 470)
  })

  it('12 V + 100 Ω: I = 100 mA > 20 mA → aviso led-overcurrent', () => {
    // I = (12 − 2) / 100 = 0,1 A, cinco vezes a corrente máxima (0,02 A)
    // (e a resistência de 1/4 W dissipa 100 × 0,1² = 1 W → também avisa, ver resistor-overpower)
    const r = ok(ledCircuit({ resistance: 100 }))
    expectRelative(result(r, 'D1').current, 0.1)
    expect(r.issues).toEqual([
      expect.objectContaining({ code: 'resistor-overpower', componentIds: ['R1'] }),
      expect.objectContaining({
        severity: 'warning',
        code: 'led-overcurrent',
        componentIds: ['D1'],
      }),
    ])
    // Os dados da mensagem (correntes em A), para a interface a escrever noutra língua.
    const params = r.issues.find((i) => i.code === 'led-overcurrent')?.params
    expect(params?.name).toBe('D1')
    expect(params?.current).toBeCloseTo(0.1, 9)
    expect(params?.max).toBeCloseTo(0.02, 9)
  })

  it('com 470 Ω (21,28 mA > 20 mA) também avisa; com 1 kΩ (10 mA) não', () => {
    // 470 Ω: I = 21,28 mA, ligeiramente acima de 20 mA ;  1 kΩ: I = 10 / 1000 = 10 mA
    expect(ok(ledCircuit({})).issues.map((i) => i.code)).toEqual(['led-overcurrent'])
    expect(ok(ledCircuit({ resistance: 1000 })).issues).toEqual([])
  })
})

describe('simulateDc — resto do circuito', () => {
  it('divisor 12 V (1 kΩ + 2 kΩ): 8 V no meio, 4 mA', () => {
    //   V(meio) = 12 · 2000 / 3000 = 8 V ;  I = 12 / 3000 = 4 mA
    const c: Component[] = []
    part(c, 'dc-source', { voltage: 12 })
    part(c, 'resistor', { resistance: 1000 })
    part(c, 'resistor', { resistance: 2000 })
    part(c, 'ground')
    const r = ok(
      simulateDc({
        components: c,
        wires: [
          wire('V1:+', 'R1:a'),
          wire('R1:b', 'R2:a'),
          wire('R2:b', 'GND1:gnd'),
          wire('V1:-', 'GND1:gnd'),
        ],
      }),
    )
    expectRelative(r.terminalVoltages.get('R1:b') ?? 0, 8)
    expectRelative(result(r, 'R1').current, 0.004)
    expect(r.results.has('GND1')).toBe(false) // o GND não tem resultados
  })

  it('interruptor aberto: I = 0 A, U aos terminais do interruptor = 12 V', () => {
    //   V1+ ── S1 (aberto) ── R1 ── GND1 ── V1−
    // Sem corrente, R1 não tem queda: V(S1:b) = 0 V ;  V(S1:a) = 12 V  →  U_S1 = 12 V
    const c: Component[] = []
    part(c, 'dc-source', { voltage: 12 })
    part(c, 'switch', { closed: false })
    part(c, 'resistor', { resistance: 1000 })
    part(c, 'ground')
    const r = ok(
      simulateDc({
        components: c,
        wires: [
          wire('V1:+', 'S1:a'),
          wire('S1:b', 'R1:a'),
          wire('R1:b', 'GND1:gnd'),
          wire('V1:-', 'GND1:gnd'),
        ],
      }),
    )
    expect(result(r, 'S1')).toEqual({ voltage: 12, current: 0, power: 0 })
    expect(r.issues.map((i) => i.code)).toEqual(['open-circuit']) // aviso da validação
  })

  it('circuito com erro de validação (sem GND) → não calcula e devolve os erros', () => {
    const c: Component[] = []
    part(c, 'dc-source')
    part(c, 'resistor')
    const r = simulateDc({ components: c, wires: [wire('V1:+', 'R1:a'), wire('R1:b', 'V1:-')] })
    expect(r.ok).toBe(false)
    expect(r.issues.map((i) => i.code)).toEqual(['no-ground'])
  })
})

describe('simulateDc — potência nominal da resistência', () => {
  /** V1 ── R1 ── GND (uma só resistência aos terminais da fonte). */
  function single(voltage: number, resistance: number, ratedPower?: number) {
    const c: Component[] = []
    part(c, 'dc-source', { voltage })
    part(c, 'resistor', { resistance, ratedPower })
    part(c, 'ground')
    return ok(
      simulateDc({
        components: c,
        wires: [wire('V1:+', 'R1:a'), wire('R1:b', 'GND1:gnd'), wire('V1:-', 'GND1:gnd')],
      }),
    )
  }

  it('12 V em 100 Ω com 1/4 W: P = 12² / 100 = 1,44 W > 0,25 W → aviso', () => {
    const r = single(12, 100, 0.25)
    expectRelative(result(r, 'R1').power, 1.44)
    expect(r.issues).toEqual([
      expect.objectContaining({
        severity: 'warning',
        code: 'resistor-overpower',
        componentIds: ['R1'],
      }),
    ])
    expect(r.issues[0]?.params?.power).toBeCloseTo(1.44, 9)
    expect(r.issues[0]?.params?.max).toBe(0.25)
  })

  it('com 2 W chega (1,44 W < 2 W): sem aviso; sem potência nominal também não avisa', () => {
    expect(single(12, 100, 2).issues).toEqual([])
    expect(single(12, 100, undefined).issues).toEqual([])
  })

  it('12 V em 1 kΩ com 1/8 W: P = 144 / 1000 = 0,144 W > 0,125 W → aviso', () => {
    expect(single(12, 1000, 0.125).issues.map((i) => i.code)).toEqual(['resistor-overpower'])
  })
})

describe('simulateDc — voltímetro e amperímetro (E10)', () => {
  //   V1 (12 V) + ── AM1 ── R1 (1 kΩ) ──●── R2 (2 kΩ) ── GND ── V1 −
  //                                     └── VM1 (10 MΩ) ── GND   (voltímetro aos terminais de R2)
  function divider() {
    const c: Component[] = []
    part(c, 'dc-source', { voltage: 12 })
    part(c, 'ammeter')
    part(c, 'resistor', { resistance: 1000 })
    part(c, 'resistor', { resistance: 2000 })
    part(c, 'voltmeter')
    part(c, 'ground')
    return ok(
      simulateDc({
        components: c,
        wires: [
          wire('V1:+', 'AM1:+'),
          wire('AM1:-', 'R1:a'),
          wire('R1:b', 'R2:a'),
          wire('R2:b', 'GND1:gnd'),
          wire('VM1:+', 'R2:a'),
          wire('VM1:-', 'GND1:gnd'),
          wire('V1:-', 'GND1:gnd'),
        ],
      }),
    )
  }

  it('o voltímetro lê a tensão de R2 e o amperímetro a corrente da malha (0,1 %)', () => {
    // Sem instrumentos: U(R2) = 12 · 2000 / 3000 = 8 V ; I = 12 / 3000 = 4 mA.
    // Com eles: R2 ∥ 10 MΩ = 1999,6 Ω e mais 1 mΩ em série → diferença < 0,01 % (desprezável).
    const r = divider()
    expectRelative(result(r, 'VM1').voltage, 8)
    expectRelative(result(r, 'AM1').current, 0.004)
    // O amperímetro quase não tira tensão: U = 1 mΩ · 4 mA = 4 µV.
    expect(Math.abs(result(r, 'AM1').voltage)).toBeLessThan(1e-5)
    // O voltímetro quase não tira corrente: I = 8 V / 10 MΩ = 0,8 µA.
    expectRelative(result(r, 'VM1').current, 8 / 10e6, 0.01)
    expect(r.issues).toEqual([])
  })

  it('amperímetro em paralelo com a fonte → erro de curto-circuito (via amperímetro)', () => {
    //   V1 + ── AM1 ── V1 −  : o amperímetro (1 mΩ) liga o + ao − da fonte.
    const c: Component[] = []
    part(c, 'dc-source', { voltage: 12 })
    part(c, 'ammeter')
    part(c, 'resistor', { resistance: 1000 })
    part(c, 'ground')
    const r = simulateDc({
      components: c,
      wires: [
        wire('V1:+', 'AM1:+'),
        wire('AM1:-', 'V1:-'),
        wire('V1:+', 'R1:a'),
        wire('R1:b', 'GND1:gnd'),
        wire('V1:-', 'GND1:gnd'),
      ],
    })
    expect(r.ok).toBe(false)
    expect(r.issues).toContainEqual(
      expect.objectContaining({
        code: 'source-short',
        componentIds: ['V1'],
        params: { name: 'V1', via: 'ammeter' },
      }),
    )
  })
})

describe('simulateDc — díodo real (Shockley + Newton-Raphson, E10)', () => {
  /** V1 ── R1 1 kΩ ── díodo 1N4148 (por defeito) ── GND, direto ou ao contrário. */
  function diodeCircuit(voltage: number, reversed = false) {
    const c: Component[] = []
    part(c, 'dc-source', { voltage })
    part(c, 'resistor', { resistance: 1000 })
    part(c, 'diode')
    part(c, 'ground')
    const [top, bottom] = reversed ? ['D1:catodo', 'D1:anodo'] : ['D1:anodo', 'D1:catodo']
    return simulateDc({
      components: c,
      wires: [
        wire('V1:+', 'R1:a'),
        wire('R1:b', top as TerminalId),
        wire(bottom as TerminalId, 'GND1:gnd'),
        wire('GND1:gnd', 'V1:-'),
      ],
    })
  }

  it('5 V + 1 kΩ + 1N4148 direto → U = 0,6505 V, I = 4,3495 mA, conduz', () => {
    // À mão (ver newton.test.ts): U = 0,045293 · ln(I / 2,52e-9 + 1), I = (5 − U) / 1000
    //   → U = 0,650463 V, I = 4,349537 mA
    const r = diodeCircuit(5)
    expectRelative(result(r, 'D1').voltage, 0.650463, 1e-5)
    expectRelative(result(r, 'D1').current, 4.349537e-3, 1e-5)
    expectRelative(result(r, 'R1').voltage, 5 - 0.650463, 1e-5)
    expect(result(r, 'D1').diodeState).toBe('conducting')
    expect(result(r, 'D1').ledState).toBeUndefined()
  })

  it('díodo ao contrário → bloqueado: U ≈ −5 V, I ≈ 0', () => {
    const r = diodeCircuit(5, true)
    expect(result(r, 'D1').voltage).toBeCloseTo(-5, 4)
    expect(Math.abs(result(r, 'D1').current)).toBeLessThan(1e-8)
    expect(result(r, 'D1').diodeState).toBe('blocked')
  })

  it('LED (modelo simples) e díodo real no mesmo circuito: D1 = LED, D2 = díodo', () => {
    //   V1 12 V ── R1 1 kΩ ── D1 LED (Vf = 2 V) ── D2 díodo ── GND
    //   À mão: 12 = 1000·I + 2 + 0,045293 · ln(I / 2,52e-9 + 1)
    //     I = 9,4 mA → U(D2) = 0,045293 · ln(3,730159e6) = 0,685367 V → I = 9,314633 mA
    //     → U(D2) = 0,684954 V → I = 9,315046 mA → U(D2) = 0,684956 V, I = 9,315044 mA (estável)
    const c: Component[] = []
    part(c, 'dc-source')
    part(c, 'resistor', { resistance: 1000 })
    part(c, 'led')
    part(c, 'diode')
    part(c, 'ground')
    const r = simulateDc({
      components: c,
      wires: [
        wire('V1:+', 'R1:a'),
        wire('R1:b', 'D1:anodo'),
        wire('D1:catodo', 'D2:anodo'),
        wire('D2:catodo', 'GND1:gnd'),
        wire('GND1:gnd', 'V1:-'),
      ],
    })
    expectRelative(result(r, 'D2').voltage, 0.684956, 1e-5)
    expectRelative(result(r, 'R1').current, 9.315044e-3, 1e-5)
    expect(result(r, 'D1').ledState).toBe('on')
    expect(result(r, 'D2').diodeState).toBe('conducting')
  })
})
