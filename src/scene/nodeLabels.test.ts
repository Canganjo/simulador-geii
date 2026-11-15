import { describe, expect, it } from 'vitest'
import { createComponent } from '../core/library'
import type { Component, ComponentKind, TerminalId, Wire } from '../core/model'
import { nodeLabels } from './nodeLabels'

/** Componente com ID = nome (V1, R1, D1…), como nos testes do core. */
function part(list: Component[], kind: ComponentKind): Component {
  const c = createComponent(kind, { x: 0, y: 0 }, { existing: list, newId: () => '' })
  const id = c.name
  const component = {
    ...c,
    id,
    terminals: c.terminals.map((t) => ({ ...t, id: `${id}:${t.name}`, componentId: id })),
  } as Component
  list.push(component)
  return component
}
let n = 0
const wire = (from: TerminalId, to: TerminalId): Wire => ({ id: `w${++n}`, from, to })

describe('nodeLabels', () => {
  it('V1 ── R1 ── D1 ── GND: cada fio junta dois terminais no mesmo nó', () => {
    // Nós à mão: GND, D1:catodo e V1:- → 0 (referência);
    // V1:+ e R1:a → 1 (primeiro grupo pela ordem dos componentes); R1:b e D1:anodo → 2.
    const c: Component[] = []
    part(c, 'dc-source')
    part(c, 'resistor')
    part(c, 'led')
    part(c, 'ground')
    const labels = nodeLabels({
      components: c,
      wires: [
        wire('V1:+', 'R1:a'),
        wire('R1:b', 'D1:anodo'),
        wire('D1:catodo', 'GND1:gnd'),
        wire('GND1:gnd', 'V1:-'),
      ],
    })
    expect(Object.fromEntries(labels)).toEqual({
      'V1:+': '1',
      'V1:-': '0',
      'R1:a': '1',
      'R1:b': '2',
      'D1:anodo': '2',
      'D1:catodo': '0',
      'GND1:gnd': '0',
    })
  })

  it('terminais sem fio mostram "–"; o GND é sempre o nó 0', () => {
    const c: Component[] = []
    part(c, 'resistor')
    part(c, 'ground')
    const labels = nodeLabels({ components: c, wires: [] })
    expect(labels.get('R1:a')).toBe('–')
    expect(labels.get('R1:b')).toBe('–')
    expect(labels.get('GND1:gnd')).toBe('0')
  })
})
