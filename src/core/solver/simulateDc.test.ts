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
    const r = ok(ledCircuit({ resistance: 100 }))
    expectRelative(result(r, 'D1').current, 0.1)
    expect(r.issues).toEqual([
      expect.objectContaining({
        severity: 'warning',
        code: 'led-overcurrent',
        componentIds: ['D1'],
      }),
    ])
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
