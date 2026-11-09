import { describe, expect, it } from 'vitest'
import { createComponent } from '../library'
import type { Component, ComponentKind, ComponentParamsByKind, TerminalId, Wire } from '../model'
import { validateProject, type IssueCode } from './validateProject'

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

const codes = (r: ReturnType<typeof validateProject>): IssueCode[] => r.issues.map((i) => i.code)

/** Divisor de referência: V1 12 V, R1 1 kΩ, R2 2 kΩ, GND1. */
function divider() {
  //   V1+ ── R1 ──●── R2 ──┐
  //   V1− ─────────────────┴── GND1
  const c: Component[] = []
  part(c, 'dc-source')
  part(c, 'resistor')
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

describe('validateProject', () => {
  it('o divisor de referência não tem nenhum problema', () => {
    const { c, w } = divider()
    expect(validateProject({ components: c, wires: w })).toEqual({ ok: true, issues: [] })
  })

  it('sem fonte → erro no-source', () => {
    //   R1 ── GND1 (só uma resistência ligada ao GND, dos dois lados)
    const c: Component[] = []
    part(c, 'resistor')
    part(c, 'ground')
    const r = validateProject({
      components: c,
      wires: [wire('R1:a', 'GND1:gnd'), wire('R1:b', 'GND1:gnd')],
    })
    expect(r.ok).toBe(false)
    expect(codes(r)).toEqual(['no-source'])
    expect(r.issues[0]?.severity).toBe('error')
  })

  it('sem GND → erro no-ground', () => {
    //   V1+ ── R1 ── V1−   (sem GND)
    const c: Component[] = []
    part(c, 'dc-source')
    part(c, 'resistor')
    const r = validateProject({
      components: c,
      wires: [wire('V1:+', 'R1:a'), wire('R1:b', 'V1:-')],
    })
    expect(r.ok).toBe(false)
    expect(codes(r)).toEqual(['no-ground'])
    expect(r.issues[0]?.message).toContain('GND')
  })

  it('fio para um terminal inexistente → erro invalid-wire', () => {
    const { c, w } = divider()
    const r = validateProject({
      components: c,
      wires: [...w, { id: 'w99', from: 'R1:a', to: 'X1:+' }],
    })
    expect(codes(r)).toEqual(['invalid-wire'])
    expect(r.issues[0]?.message).toContain('w99')
  })

  it('resistência de 0 Ω → erro invalid-params com o nome do componente', () => {
    const { c, w } = divider()
    const r1 = c.find((x) => x.id === 'R1')
    if (r1?.kind === 'resistor') r1.params.resistance = 0
    const r = validateProject({ components: c, wires: w })
    expect(r.ok).toBe(false)
    expect(codes(r)).toEqual(['invalid-params'])
    expect(r.issues[0]).toMatchObject({ componentIds: ['R1'] })
    expect(r.issues[0]?.message).toContain('R1')
  })

  it('+ e − da fonte ligados por um fio → erro source-short', () => {
    //   V1+ ──┬── V1−  (fio direto)  ;  V1− ── GND1
    const c: Component[] = []
    part(c, 'dc-source')
    part(c, 'ground')
    const r = validateProject({
      components: c,
      wires: [wire('V1:+', 'V1:-'), wire('V1:-', 'GND1:gnd')],
    })
    expect(codes(r)).toEqual(['source-short'])
    expect(r.issues[0]?.message).toContain('V1')
    expect(r.issues[0]?.message).toContain('fio')
  })

  it('+ e − da fonte ligados por um interruptor fechado → erro source-short', () => {
    //   V1+ ── S1 (fechado) ── V1− ── GND1
    const c: Component[] = []
    part(c, 'dc-source')
    part(c, 'switch', { closed: true })
    part(c, 'ground')
    const r = validateProject({
      components: c,
      wires: [wire('V1:+', 'S1:a'), wire('S1:b', 'V1:-'), wire('V1:-', 'GND1:gnd')],
    })
    expect(codes(r)).toEqual(['source-short'])
    expect(r.issues[0]?.message).toContain('interruptor')
  })

  it('duas fontes entre os mesmos nós → erro parallel-sources', () => {
    //   V1+ ──┬── V2+ ── R1 ──┐
    //   V1− ──┴── V2− ────────┴── GND1
    const c: Component[] = []
    part(c, 'dc-source', { voltage: 12 })
    part(c, 'dc-source', { voltage: 5 })
    part(c, 'resistor')
    part(c, 'ground')
    const r = validateProject({
      components: c,
      wires: [
        wire('V1:+', 'V2:+'),
        wire('V2:+', 'R1:a'),
        wire('R1:b', 'GND1:gnd'),
        wire('V1:-', 'V2:-'),
        wire('V2:-', 'GND1:gnd'),
      ],
    })
    expect(codes(r)).toEqual(['parallel-sources'])
    expect(r.issues[0]?.componentIds).toEqual(['V1', 'V2'])
  })

  it('resistência ligada só a si própria, longe do GND → erro floating-part', () => {
    //   divisor normal  +  R3 com os dois terminais ligados um ao outro (ilha sem GND)
    const { c, w } = divider()
    part(c, 'resistor')
    const r = validateProject({ components: c, wires: [...w, wire('R3:a', 'R3:b')] })
    expect(r.ok).toBe(false)
    expect(codes(r)).toEqual(['floating-part'])
    expect(r.issues[0]?.componentIds).toEqual(['R3'])
  })

  it('interruptor aberto → só aviso open-circuit (o cálculo pode fazer-se: I = 0 A)', () => {
    //   V1+ ── S1 (aberto) ── R1 ──┐
    //   V1− ───────────────────────┴── GND1
    const c: Component[] = []
    part(c, 'dc-source')
    part(c, 'switch', { closed: false })
    part(c, 'resistor')
    part(c, 'ground')
    const r = validateProject({
      components: c,
      wires: [
        wire('V1:+', 'S1:a'),
        wire('S1:b', 'R1:a'),
        wire('R1:b', 'GND1:gnd'),
        wire('V1:-', 'GND1:gnd'),
      ],
    })
    expect(r.ok).toBe(true)
    expect(r.issues).toEqual([
      expect.objectContaining({ severity: 'warning', code: 'open-circuit', componentIds: ['V1'] }),
    ])
  })

  it('terminal sem fio → aviso loose-terminal (e circuito aberto)', () => {
    //   V1+ ── R1:a   R1:b (solto)   ;   V1− ── GND1
    const c: Component[] = []
    part(c, 'dc-source')
    part(c, 'resistor')
    part(c, 'ground')
    const r = validateProject({
      components: c,
      wires: [wire('V1:+', 'R1:a'), wire('V1:-', 'GND1:gnd')],
    })
    expect(r.ok).toBe(true)
    expect(codes(r)).toEqual(['open-circuit', 'loose-terminal'])
    expect(r.issues[1]?.message).toBe('R1: o terminal b não está ligado.')
  })

  it('o terminal solto do LED aparece com o nome legível (cátodo)', () => {
    const c: Component[] = []
    part(c, 'led')
    const r = validateProject({ components: c, wires: [] })
    const messages = r.issues.filter((i) => i.code === 'loose-terminal').map((i) => i.message)
    expect(messages).toEqual([
      'D1: o terminal ânodo não está ligado.',
      'D1: o terminal cátodo não está ligado.',
    ])
  })

  it('projeto vazio → erros no-source e no-ground', () => {
    const r = validateProject({ components: [], wires: [] })
    expect(r.ok).toBe(false)
    expect(codes(r)).toEqual(['no-source', 'no-ground'])
  })
})
