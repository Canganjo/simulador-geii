import { describe, expect, it } from 'vitest'
import { createComponent } from '../core/library'
import type {
  Component,
  ComponentKind,
  ComponentParamsByKind,
  TerminalId,
  Wire,
} from '../core/model'
import { simulateDc } from '../core/solver'
import { LAMP_LIGHT, LED_LIGHT, NO_VISUAL, visualState } from './visualState'

/** Componente com ID = nome (V1, R1, D1…), como nos testes do core. */
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
let n = 0
const wire = (from: TerminalId, to: TerminalId): Wire => ({ id: `w${++n}`, from, to })

/** V1 ── L1 ── GND1 ── V1− : a lâmpada (12 V / 1 W → R = 144 Ω) diretamente na fonte. */
function lampOn(voltage: number) {
  const c: Component[] = []
  part(c, 'dc-source', { voltage })
  const lamp = part(c, 'lamp')
  part(c, 'ground')
  const result = simulateDc({
    components: c,
    wires: [wire('V1:+', 'L1:a'), wire('L1:b', 'GND1:gnd'), wire('GND1:gnd', 'V1:-')],
  })
  return { lamp, result }
}

describe('visualState', () => {
  it('sem resultados → tudo normal', () => {
    const c: Component[] = []
    expect(visualState(part(c, 'led'), null)).toEqual(NO_VISUAL)
  })

  it('lâmpada 12 V / 1 W à tensão nominal → brilho máximo', () => {
    // P = U² / R = 12² / 144 = 1 W → P / Pnominal = 1
    const { lamp, result } = lampOn(12)
    const v = visualState(lamp, result)
    expect(v.glow).toBeCloseTo(1, 9)
    expect(v.glowColor).toBe(LAMP_LIGHT)
  })

  it('lâmpada a metade da tensão → ¼ do brilho', () => {
    // P = 6² / 144 = 0,25 W → 0,25 / 1 = 0,25
    const { lamp, result } = lampOn(6)
    expect(visualState(lamp, result).glow).toBeCloseTo(0.25, 9)
  })

  it('lâmpada acima da tensão nominal → o brilho fica no máximo (1)', () => {
    // P = 24² / 144 = 4 W → 4 / 1 = 4, limitado a 1
    const { lamp, result } = lampOn(24)
    expect(visualState(lamp, result).glow).toBe(1)
  })

  it('LED aceso brilha na sua cor; em sobrecorrente pisca e tem aviso', () => {
    // V1 = 12 V ── R1 = 100 Ω ── D1 azul ── GND : I = (12 − 2) / 100 = 100 mA > 20 mA
    const c: Component[] = []
    part(c, 'dc-source')
    part(c, 'resistor', { resistance: 100 })
    const led = part(c, 'led', { color: 'azul' })
    part(c, 'ground')
    const result = simulateDc({
      components: c,
      wires: [
        wire('V1:+', 'R1:a'),
        wire('R1:b', 'D1:anodo'),
        wire('D1:catodo', 'GND1:gnd'),
        wire('GND1:gnd', 'V1:-'),
      ],
    })
    expect(visualState(led, result)).toEqual({
      glow: 1,
      glowColor: LED_LIGHT.azul,
      issue: 'warning',
      blink: true,
      source: null,
      reading: null,
    })
  })

  it('erro na simulação → contorno de erro no componente envolvido, sem brilho', () => {
    // Só uma resistência: não há fonte nem GND (erros sem componente) e os terminais estão
    // soltos (avisos de R1) → R1 fica com aviso.
    const c: Component[] = []
    const r = part(c, 'resistor')
    const result = simulateDc({ components: c, wires: [] })
    expect(result.ok).toBe(false)
    expect(visualState(r, result)).toMatchObject({ glow: 0, issue: 'warning' })
  })

  it('fonte em curto-circuito → erro na fonte', () => {
    const c: Component[] = []
    const v = part(c, 'dc-source')
    part(c, 'ground')
    const result = simulateDc({
      components: c,
      wires: [wire('V1:+', 'V1:-'), wire('V1:-', 'GND1:gnd')],
    })
    expect(visualState(v, result).issue).toBe('error')
  })

  it('instrumentos: o voltímetro lê V e o amperímetro lê A (para o visor)', () => {
    //   V1 (12 V) + ── AM1 ── R1 (1 kΩ) ── GND, VM1 aos terminais de R1
    //   I = 12 / 1000 = 12 mA ; U(R1) = 12 V (o 1 mΩ do amperímetro é desprezável).
    const c: Component[] = []
    part(c, 'dc-source', { voltage: 12 })
    const am = part(c, 'ammeter')
    part(c, 'resistor', { resistance: 1000 })
    const vm = part(c, 'voltmeter')
    part(c, 'ground')
    const result = simulateDc({
      components: c,
      wires: [
        wire('V1:+', 'AM1:+'),
        wire('AM1:-', 'R1:a'),
        wire('R1:b', 'GND1:gnd'),
        wire('VM1:+', 'R1:a'),
        wire('VM1:-', 'GND1:gnd'),
        wire('GND1:gnd', 'V1:-'),
      ],
    })
    expect(visualState(vm, result).reading).toBeCloseTo(12, 3)
    // O amperímetro também conta os 1,2 µA do voltímetro (12 V / 10 MΩ): 12,0012 mA.
    expect(visualState(am, result).reading).toBeCloseTo(0.012, 5)
    // Antes de Simular não há leitura.
    expect(visualState(vm, null).reading).toBeNull()
  })
})
