import { describe, expect, it } from 'vitest'
import { createComponent } from '../library'
import type { Component, ComponentKind, TerminalId, Wire } from '../model'
import { buildNodes } from './buildNodes'

/**
 * Pequeno construtor de circuitos para os testes: IDs previsíveis (V1, R1…) para ler os
 * terminais como "R1:a", "V1:+", "GND1:gnd".
 */
function circuit(kinds: readonly ComponentKind[]) {
  const components: Component[] = []
  for (const kind of kinds) {
    const c = createComponent(kind, { x: 0, y: 0 }, { existing: components, newId: () => '' })
    // ID = nome, para os testes ficarem legíveis.
    const id = c.name
    components.push({
      ...c,
      id,
      terminals: c.terminals.map((t) => ({ ...t, id: `${id}:${t.name}`, componentId: id })),
    } as Component)
  }
  return components
}

let wireCount = 0
function wire(from: TerminalId, to: TerminalId): Wire {
  return { id: `w${++wireCount}`, from, to }
}

describe('buildNodes', () => {
  it('divisor de tensão: 3 nós (0 = GND, 1 = topo, 2 = meio)', () => {
    //   V1+ ──── R1 ──── R2 ──┐
    //   │       a  b    a  b   │
    //   V1−  ─────────────────┴── GND1
    //
    // nó 1: V1:+, R1:a   ·   nó 2 (meio): R1:b, R2:a   ·   nó 0: V1:-, R2:b, GND1:gnd
    const components = circuit(['dc-source', 'resistor', 'resistor', 'ground'])
    const nodes = buildNodes({
      components,
      wires: [
        wire('V1:+', 'R1:a'),
        wire('R1:b', 'R2:a'),
        wire('R2:b', 'GND1:gnd'),
        wire('V1:-', 'GND1:gnd'),
      ],
    })

    expect(nodes.nodeCount).toBe(3)
    expect(nodes.hasGround).toBe(true)
    expect(nodes.nodeOf.get('GND1:gnd')).toBe(0)
    expect(nodes.nodeOf.get('V1:-')).toBe(0)
    expect(nodes.nodeOf.get('R2:b')).toBe(0)
    expect(nodes.nodeOf.get('V1:+')).toBe(1)
    expect(nodes.nodeOf.get('R1:a')).toBe(1)
    expect(nodes.nodeOf.get('R1:b')).toBe(2)
    expect(nodes.nodeOf.get('R2:a')).toBe(2)
    expect(nodes.looseTerminals).toEqual([])
    expect(nodes.invalidWires).toEqual([])
  })

  it('duas resistências em paralelo: 2 nós (0 e 1)', () => {
    //   V1+ ──┬── R1:a        R1:b ──┬── V1− ── GND1
    //         └── R2:a        R2:b ──┘
    const components = circuit(['dc-source', 'resistor', 'resistor', 'ground'])
    const nodes = buildNodes({
      components,
      wires: [
        wire('V1:+', 'R1:a'),
        wire('V1:+', 'R2:a'),
        wire('R1:b', 'V1:-'),
        wire('R2:b', 'V1:-'),
        wire('V1:-', 'GND1:gnd'),
      ],
    })

    expect(nodes.nodeCount).toBe(2)
    expect(nodes.nodes).toEqual([
      { index: 0, terminals: ['V1:-', 'R1:b', 'R2:b', 'GND1:gnd'] },
      { index: 1, terminals: ['V1:+', 'R1:a', 'R2:a'] },
    ])
  })

  it('terminal solto: fica num nó só para ele e aparece em looseTerminals', () => {
    //   V1+ ── R1:a   R1:b (solto)
    //   V1− ── GND1
    const components = circuit(['dc-source', 'resistor', 'ground'])
    const nodes = buildNodes({
      components,
      wires: [wire('V1:+', 'R1:a'), wire('V1:-', 'GND1:gnd')],
    })

    // nós: 0 (V1:-, GND1), 1 (V1:+, R1:a), 2 (R1:b sozinho)
    expect(nodes.nodeCount).toBe(3)
    expect(nodes.looseTerminals).toEqual(['R1:b'])
    const loose = nodes.nodeOf.get('R1:b')
    expect(nodes.nodes.find((n) => n.index === loose)?.terminals).toEqual(['R1:b'])
  })

  it('circuito sem GND: hasGround = false e não há nó 0', () => {
    //   V1+ ── R1 ── V1−   (sem símbolo GND)
    const components = circuit(['dc-source', 'resistor'])
    const nodes = buildNodes({
      components,
      wires: [wire('V1:+', 'R1:a'), wire('R1:b', 'V1:-')],
    })

    expect(nodes.hasGround).toBe(false)
    expect(nodes.nodeCount).toBe(2)
    expect(nodes.nodes.map((n) => n.index)).toEqual([1, 2])
    expect([...nodes.nodeOf.values()]).not.toContain(0)
  })

  it('vários símbolos GND são todos o nó 0, mesmo sem fio entre eles', () => {
    //   V1− ── GND1        R1:b ── GND2        V1+ ── R1:a
    const components = circuit(['dc-source', 'resistor', 'ground', 'ground'])
    const nodes = buildNodes({
      components,
      wires: [wire('V1:+', 'R1:a'), wire('V1:-', 'GND1:gnd'), wire('R1:b', 'GND2:gnd')],
    })

    expect(nodes.nodeCount).toBe(2)
    expect(nodes.nodeOf.get('GND1:gnd')).toBe(0)
    expect(nodes.nodeOf.get('GND2:gnd')).toBe(0)
    expect(nodes.nodeOf.get('R1:b')).toBe(0)
  })

  it('um fio para um terminal que não existe é ignorado e listado', () => {
    const components = circuit(['resistor', 'ground'])
    const bad = wire('R1:a', 'X9:+')
    const nodes = buildNodes({ components, wires: [bad, wire('R1:b', 'GND1:gnd')] })

    expect(nodes.invalidWires).toEqual([bad])
    expect(nodes.looseTerminals).toEqual(['R1:a']) // o fio inválido não conta como ligação
    expect(nodes.nodeCount).toBe(2)
  })

  it('fios repetidos ou em laço não criam nós a mais', () => {
    const components = circuit(['resistor', 'ground'])
    const nodes = buildNodes({
      components,
      wires: [
        wire('R1:b', 'GND1:gnd'),
        wire('GND1:gnd', 'R1:b'), // o mesmo fio ao contrário
        wire('R1:b', 'GND1:gnd'), // repetido
      ],
    })
    expect(nodes.nodeCount).toBe(2) // 0 (R1:b, GND1) e 1 (R1:a)
  })

  it('projeto vazio: 0 nós, sem GND', () => {
    const nodes = buildNodes({ components: [], wires: [] })
    expect(nodes.nodeCount).toBe(0)
    expect(nodes.hasGround).toBe(false)
  })
})
