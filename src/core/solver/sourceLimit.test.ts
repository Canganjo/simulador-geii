import { describe, expect, it } from 'vitest'
import { createComponent } from '../library'
import type { Component, ComponentKind, ComponentParamsByKind, TerminalId, Wire } from '../model'
import { simulateDc, type ComponentResult, type SimulationResult } from './simulateDc'
import { simulateTransient } from './simulateTransient'

/**
 * Fonte DC com limite de corrente (D-013), como uma fonte de bancada do laboratório:
 *   - CV (tensão constante): U = tensão regulada, I = o que a carga pedir (se I ≤ Imax);
 *   - CC (corrente constante): a carga pede mais do que Imax → I = Imax e a tensão cai
 *     para U = R · Imax (U < tensão regulada).
 */

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

/** V1 ── R1 ── GND1 ── V1−. */
function sourceAndResistor(
  source: Partial<ComponentParamsByKind['dc-source']>,
  resistance: number,
) {
  const c: Component[] = []
  part(c, 'dc-source', source)
  part(c, 'resistor', { resistance })
  part(c, 'ground')
  const wires = [wire('V1:+', 'R1:a'), wire('R1:b', 'GND1:gnd'), wire('V1:-', 'GND1:gnd')]
  return simulateDc({ components: c, wires })
}

describe('fonte DC com limite de corrente (CV/CC)', () => {
  it('valores por defeito: 12 V e limite de 3 A', () => {
    const c: Component[] = []
    part(c, 'dc-source')
    const v1 = c[0]
    expect(v1?.kind === 'dc-source' && v1.params).toEqual({ voltage: 12, currentLimit: 3 })
  })

  it('12 V, Imax = 100 mA, R = 1 kΩ → CV: U = 12 V, I = 12 mA', () => {
    //   Em CV: I = 12 / 1000 = 12 mA ≤ 100 mA → a fonte mantém os 12 V.
    const r = sourceAndResistor({ voltage: 12, currentLimit: 0.1 }, 1000)
    const v1 = result(r, 'V1')
    expect(v1.sourceMode).toBe('cv')
    expect(v1.voltage).toBeCloseTo(12, 9)
    expect(v1.current).toBeCloseTo(0.012, 9)
    expect(v1.power).toBeCloseTo(-0.144, 9) // fornece 12 · 0,012 = 0,144 W
    expect(ok(r).issues.map((i) => i.code)).not.toContain('source-current-limit')
  })

  it('12 V, Imax = 100 mA, R = 47 Ω → CC: I = 100 mA, U = 4,7 V', () => {
    //   Em CV pediria I = 12 / 47 = 255,3 mA > 100 mA → passa a CC:
    //   I = 100 mA ;  U = R · I = 47 · 0,1 = 4,7 V (< 12 V, coerente com CC)
    //   P(R1) = U · I = 4,7 · 0,1 = 0,47 W ;  P(V1) = −0,47 W (fornece)
    const r = sourceAndResistor({ voltage: 12, currentLimit: 0.1 }, 47)
    const v1 = result(r, 'V1')
    expect(v1.sourceMode).toBe('cc')
    expect(v1.current).toBeCloseTo(0.1, 9)
    expect(v1.voltage).toBeCloseTo(4.7, 9)
    expect(v1.power).toBeCloseTo(-0.47, 9)
    const r1 = result(r, 'R1')
    expect(r1.voltage).toBeCloseTo(4.7, 9)
    expect(r1.current).toBeCloseTo(0.1, 9)
    expect(r1.power).toBeCloseTo(0.47, 9)
    // Aviso para o aluno (a fonte está no limite).
    const issue = ok(r).issues.find((i) => i.code === 'source-current-limit')
    expect(issue?.componentIds).toEqual(['V1'])
    expect(issue?.params).toMatchObject({ name: 'V1' })
  })

  it('no limite exato (12 V, Imax = 100 mA, R = 120 Ω) → fica em CV', () => {
    //   I = 12 / 120 = 100 mA = Imax → não ultrapassa → CV, U = 12 V.
    const v1 = result(sourceAndResistor({ voltage: 12, currentLimit: 0.1 }, 120), 'V1')
    expect(v1.sourceMode).toBe('cv')
    expect(v1.voltage).toBeCloseTo(12, 9)
    expect(v1.current).toBeCloseTo(0.1, 9)
  })

  it('sem limite (fonte ideal, ficheiros antigos no core): 12 V em 1 Ω → 12 A, CV', () => {
    //   I = 12 / 1 = 12 A — sem currentLimit a fonte dá o que for preciso.
    const v1 = result(sourceAndResistor({ voltage: 12, currentLimit: undefined }, 1), 'V1')
    expect(v1.sourceMode).toBe('cv')
    expect(v1.current).toBeCloseTo(12, 6)
  })

  it('CC com LED: 12 V, Imax = 10 mA, 470 Ω + LED (Vf = 2 V) → I = 10 mA, U = 6,7 V', () => {
    //   Em CV: I = (12 − 2) / 470 = 21,28 mA > 10 mA → CC.
    //   Em CC: I = 10 mA ; U(R1) = 470 · 0,01 = 4,7 V ; U(V1) = 4,7 + 2 = 6,7 V (< 12 V).
    //   O LED continua aceso (I > 0) e já não está em sobrecorrente (10 mA < 20 mA).
    const c: Component[] = []
    part(c, 'dc-source', { voltage: 12, currentLimit: 0.01 })
    part(c, 'resistor', { resistance: 470 })
    part(c, 'led', { forwardVoltage: 2, seriesResistance: 0, maxCurrent: 0.02 })
    part(c, 'ground')
    const r = simulateDc({
      components: c,
      wires: [
        wire('V1:+', 'R1:a'),
        wire('R1:b', 'D1:anodo'),
        wire('D1:catodo', 'GND1:gnd'),
        wire('V1:-', 'GND1:gnd'),
      ],
    })
    const v1 = result(r, 'V1')
    expect(v1.sourceMode).toBe('cc')
    expect(v1.current).toBeCloseTo(0.01, 9)
    expect(v1.voltage).toBeCloseTo(6.7, 9)
    expect(result(r, 'D1').ledState).toBe('on')
    expect(result(r, 'D1').current).toBeCloseTo(0.01, 9)
    expect(ok(r).issues.map((i) => i.code)).not.toContain('led-overcurrent')
  })

  it('transitório: a fonte fica ideal, mas avisa se o pico passa o limite', () => {
    //   RC: 10 V, 1 kΩ, 100 µF descarregado (τ = 0,1 s).
    //   Em t = 0: u_C = 0 V → i = (10 − 0) / 1000 = 10 mA (o pico, depois a corrente desce)
    //   10 mA > Imax = 5 mA → aviso (mas o cálculo no tempo não limita a corrente).
    const build = (currentLimit: number) => {
      const c: Component[] = []
      part(c, 'dc-source', { voltage: 10, currentLimit })
      part(c, 'resistor', { resistance: 1000 })
      part(c, 'capacitor', { capacitance: 100e-6, initialVoltage: 0 })
      part(c, 'ground')
      return simulateTransient(
        {
          components: c,
          wires: [
            wire('V1:+', 'R1:a'),
            wire('R1:b', 'C1:a'),
            wire('C1:b', 'GND1:gnd'),
            wire('V1:-', 'GND1:gnd'),
          ],
        },
        { duration: 0.01, step: 0.001 },
      )
    }
    const limited = build(0.005)
    if (!limited.ok) throw new Error('transitório falhou')
    const issue = limited.issues.find((i) => i.code === 'source-limit-transient')
    expect(issue?.params?.current).toBeCloseTo(0.01, 9)
    expect(issue?.params?.max).toBe(0.005)
    // Com o limite por defeito (3 A) não há aviso.
    const normal = build(3)
    if (!normal.ok) throw new Error('transitório falhou')
    expect(normal.issues.map((i) => i.code)).not.toContain('source-limit-transient')
  })
})
