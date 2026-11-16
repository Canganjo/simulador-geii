import { describe, expect, it } from 'vitest'
import { createComponent } from '../library'
import { buildNetlist } from '../netlist'
import type { Component, ComponentKind, ComponentParamsByKind, TerminalId, Wire } from '../model'
import { validateProject } from '../validation'
import { simulateDc, type SimulationResult } from './simulateDc'
import { simulateTransient, type TransientSimulationResult } from './simulateTransient'

/**
 * Condensador e bobina num PROJETO (E10-4): em DC (botão Simular) e no tempo (botão Transitório).
 *
 * Lembrete (à mão):
 *   - DC, regime permanente: condensador = circuito aberto (i = C·du/dt = 0);
 *                            bobina = fio (u = L·di/dt = 0).
 *   - Carga RC a partir de 0 V: u_C(t) = E · (1 − e^(−t/τ)), τ = R·C.
 *   - Corrente RL a partir de 0 A: i(t) = (E/R) · (1 − e^(−t/τ)), τ = L/R.
 *   - Euler implícito com passo h (a = h/τ): xₖ = X∞ · (1 − (1 + a)^(−k)) — calculável à mão.
 */

/** Cria um componente com ID = nome (R1, C1, L1…), para ler os terminais como "C1:a". */
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

function dcOk(r: SimulationResult) {
  if (!r.ok) throw new Error(`simulação falhou: ${r.message ?? r.issues[0]?.message}`)
  return r
}
function trOk(r: TransientSimulationResult) {
  if (!r.ok) throw new Error(`transitório falhou: ${r.message ?? r.issues[0]?.message}`)
  return r
}

/** V1 (E) ── R1 ── X1 (C ou L) ── GND1 ── V1−. */
function seriesCircuit(
  kind: 'capacitor' | 'inductor',
  opts: {
    voltage: number
    resistance: number
    x?: Partial<ComponentParamsByKind['capacitor'] & ComponentParamsByKind['inductor']>
  },
) {
  const c: Component[] = []
  part(c, 'dc-source', { voltage: opts.voltage })
  part(c, 'resistor', { resistance: opts.resistance })
  part(c, kind, opts.x ?? {})
  part(c, 'ground')
  const x = c[2]?.id ?? ''
  return {
    project: {
      components: c,
      wires: [
        wire('V1:+', 'R1:a'),
        wire('R1:b', `${x}:a`),
        wire(`${x}:b`, 'GND1:gnd'),
        wire('V1:-', 'GND1:gnd'),
      ],
    },
    x,
  }
}

describe('netlist com C e L', () => {
  it('DC: o condensador fica de fora (aberto) e a bobina é um fio de 1 mΩ', () => {
    const rc = seriesCircuit('capacitor', { voltage: 10, resistance: 1000 })
    const dcC = buildNetlist(rc.project)
    if (!dcC.ok) throw new Error('netlist')
    expect(dcC.skipped).toEqual([{ componentId: 'C1', name: 'C1', reason: 'capacitor-open' }])
    expect(dcC.netlist.elements.map((e) => e.type)).not.toContain('capacitor')

    const rl = seriesCircuit('inductor', { voltage: 10, resistance: 10 })
    const dcL = buildNetlist(rl.project)
    if (!dcL.ok) throw new Error('netlist')
    expect(dcL.netlist.elements.find((e) => e.id === rl.x)).toMatchObject({
      type: 'resistor',
      resistance: 1e-3,
    })
  })

  it('transitório: entram como elementos "capacitor" / "inductor" com os valores iniciais', () => {
    const rc = seriesCircuit('capacitor', {
      voltage: 10,
      resistance: 1000,
      x: { capacitance: 47e-6, initialVoltage: 2 },
    })
    const tr = buildNetlist(rc.project, { mode: 'transient' })
    if (!tr.ok) throw new Error('netlist')
    expect(tr.netlist.elements.find((e) => e.id === 'C1')).toMatchObject({
      type: 'capacitor',
      capacitance: 47e-6,
      initialVoltage: 2,
    })
  })
})

describe('validação com C e L', () => {
  it('DC: bobina diretamente na fonte = curto-circuito (erro); no transitório não', () => {
    //   V1+ ── L1 ── V1−  (com GND): em DC a bobina é um fio entre + e −.
    const c: Component[] = []
    part(c, 'dc-source', { voltage: 5 })
    part(c, 'inductor')
    part(c, 'ground')
    const project = {
      components: c,
      wires: [wire('V1:+', 'L1:a'), wire('L1:b', 'V1:-'), wire('V1:-', 'GND1:gnd')],
    }
    const dc = validateProject(project)
    expect(dc.ok).toBe(false)
    expect(dc.issues).toContainEqual(
      expect.objectContaining({ code: 'source-short', params: { name: 'V1', via: 'inductor' } }),
    )
    expect(validateProject(project, { mode: 'transient' }).ok).toBe(true)
  })

  it('DC: só um condensador no caminho → aviso de circuito aberto (I = 0 é o resultado certo)', () => {
    const { project } = seriesCircuit('capacitor', { voltage: 10, resistance: 1000 })
    expect(validateProject(project).issues.map((i) => i.code)).toContain('open-circuit')
    expect(validateProject(project, { mode: 'transient' }).issues.map((i) => i.code)).not.toContain(
      'open-circuit',
    )
  })
})

describe('simulateDc com C e L (regime permanente)', () => {
  it('RC: 10 V, 1 kΩ, 100 µF → I = 0, u_C = 10 V, u_R = 0 V', () => {
    //   Aberto → não passa corrente → R1 não tem queda → toda a tensão fica no condensador.
    const { project } = seriesCircuit('capacitor', { voltage: 10, resistance: 1000 })
    const r = dcOk(simulateDc(project))
    expect(r.results.get('C1')?.voltage).toBeCloseTo(10, 6)
    expect(r.results.get('C1')?.current).toBe(0)
    expect(r.results.get('R1')?.current).toBeCloseTo(0, 9)
  })

  it('RL: 10 V, 10 Ω, 10 mH → I = E/R = 1 A, u_L ≈ 0 V', () => {
    //   Fio de 1 mΩ: I = 10 / (10 + 0,001) = 0,9999 A ; u_L = 0,9999 × 0,001 ≈ 1 mV
    const { project } = seriesCircuit('inductor', { voltage: 10, resistance: 10 })
    const r = dcOk(simulateDc(project))
    expect(r.results.get('L1')?.current).toBeCloseTo(10 / 10.001, 6)
    expect(Math.abs(r.results.get('L1')?.voltage ?? 1)).toBeLessThan(2e-3)
  })
})

describe('simulateTransient', () => {
  it('carga RC: 10 V, 1 kΩ, 100 µF (τ = 0,1 s), 0,5 s com h = 1 ms → u_C ≈ 9,93 V', () => {
    //   Exato: 10 × (1 − e^(−5)) = 10 × 0,993262 = 9,93262 V
    //   Euler (a = 0,001/0,1 = 0,01, k = 500): 10 × (1 − 1,01^(−500)) = 10 × (1 − 0,006915)
    //                                        = 9,93085 V  (diferença 0,02 %)
    const { project } = seriesCircuit('capacitor', { voltage: 10, resistance: 1000 })
    const r = trOk(simulateTransient(project, { duration: 0.5, step: 1e-3 }))
    expect(r.times).toHaveLength(501)
    expect(r.waveforms.get('C1')?.voltage[0]).toBe(0) // descarregado em t = 0
    expect(r.final.get('C1')?.voltage).toBeCloseTo(10 * (1 - 1.01 ** -500), 6)
    // Corrente no fim: (10 − 9,93085) / 1000 = 69,15 µA
    expect(r.final.get('R1')?.current).toBeCloseTo((10 - 10 * (1 - 1.01 ** -500)) / 1000, 9)
    // Tensões dos terminais no último instante (para os números dos nós na cena).
    expect(r.terminalVoltages.get('C1:a')).toBeCloseTo(r.final.get('C1')?.voltage ?? 0, 9)
  })

  it('RL: 10 V, 10 Ω, 10 mH (τ = 1 ms), 5 ms com h = 10 µs → i ≈ 0,993 A', () => {
    //   Euler (a = 10e-6/1e-3 = 0,01, k = 500): 1 × (1 − 1,01^(−500)) = 0,993085 A
    const { project } = seriesCircuit('inductor', { voltage: 10, resistance: 10 })
    const r = trOk(simulateTransient(project, { duration: 5e-3, step: 10e-6 }))
    expect(r.waveforms.get('L1')?.current[0]).toBe(0) // sem corrente em t = 0
    expect(r.final.get('L1')?.current).toBeCloseTo(1 - 1.01 ** -500, 6)
  })

  it('condensador com tensão inicial: começa nos 4 V escolhidos', () => {
    const { project } = seriesCircuit('capacitor', {
      voltage: 10,
      resistance: 1000,
      x: { initialVoltage: 4 },
    })
    const r = trOk(simulateTransient(project, { duration: 0.01, step: 1e-3 }))
    expect(r.waveforms.get('C1')?.voltage[0]).toBe(4)
    // t = 0: a corrente é (10 − 4) / 1000 = 6 mA (o condensador é uma fonte de 4 V nesse instante)
    expect(r.waveforms.get('R1')?.current[0]).toBeCloseTo(6e-3, 9)
  })

  it('LED simples → erro claro (usar o díodo); passos a mais → erro do cálculo', () => {
    const c: Component[] = []
    part(c, 'dc-source', { voltage: 5 })
    part(c, 'led')
    part(c, 'ground')
    const withLed = simulateTransient(
      {
        components: c,
        wires: [wire('V1:+', 'D1:anodo'), wire('D1:catodo', 'GND1:gnd'), wire('V1:-', 'GND1:gnd')],
      },
      { duration: 1, step: 0.1 },
    )
    expect(withLed.ok).toBe(false)
    if (!withLed.ok) expect(withLed.issues.map((i) => i.code)).toContain('led-in-transient')

    const { project } = seriesCircuit('capacitor', { voltage: 10, resistance: 1000 })
    const tooMany = simulateTransient(project, { duration: 10, step: 1e-6 })
    expect(tooMany.ok).toBe(false)
    if (!tooMany.ok) expect(tooMany.code).toBe('invalid-options')
  })
})
