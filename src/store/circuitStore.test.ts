import { beforeEach, describe, expect, it } from 'vitest'
import type { TerminalId } from '../core/model'
import { HISTORY_LIMIT, useCircuitStore } from './circuitStore'

const store = useCircuitStore
const history = () => useCircuitStore.temporal.getState()
const actions = () => store.getState()

beforeEach(() => {
  store.setState({ components: [], wires: [], selectedId: null, selectedWireId: null })
  history().clear()
})

/** Circuito de teste: V1 e R1 ligados por dois fios (V1+ → R1a, R1b → V1-). */
function sourceAndResistor() {
  const v = actions().addComponent('dc-source', { x: 0, y: 0 })
  const r = actions().addComponent('resistor', { x: 4, y: 0 })
  const w1 = actions().addWire(`${v}:+`, `${r}:a`)
  const w2 = actions().addWire(`${r}:b`, `${v}:-`)
  return { v, r, w1, w2 }
}

describe('addComponent', () => {
  it('cria o componente com nome livre e seleciona-o', () => {
    const r1 = actions().addComponent('resistor', { x: 2, y: 3 })
    const r2 = actions().addComponent('resistor', { x: 5, y: 3 })
    const { components, selectedId } = actions()
    expect(components.map((c) => c.name)).toEqual(['R1', 'R2'])
    expect(components[0]?.id).toBe(r1)
    expect(components[0]?.position).toEqual({ x: 2, y: 3 })
    expect(selectedId).toBe(r2)
    expect(history().pastStates).toHaveLength(2)
  })
})

describe('moveComponent', () => {
  it('muda só a posição do componente indicado', () => {
    const r1 = actions().addComponent('resistor', { x: 0, y: 0 })
    const r2 = actions().addComponent('resistor', { x: 1, y: 1 })
    actions().moveComponent(r1, { x: 7, y: -2 })
    const [a, b] = actions().components
    expect(a?.id).toBe(r1)
    expect(a?.position).toEqual({ x: 7, y: -2 })
    expect(b?.id).toBe(r2)
    expect(b?.position).toEqual({ x: 1, y: 1 })
  })
})

describe('rotateComponent', () => {
  it('roda +90° e volta a 0° depois de 270°', () => {
    const r = actions().addComponent('resistor', { x: 0, y: 0 })
    const angles: number[] = []
    for (let i = 0; i < 4; i++) {
      actions().rotateComponent(r)
      angles.push(actions().components[0]?.rotation ?? -1)
    }
    expect(angles).toEqual([90, 180, 270, 0])
  })
})

describe('duplicateComponent', () => {
  it('copia os parâmetros com nome e ID novos, posição +1/+1, sem fios', () => {
    const { r } = sourceAndResistor()
    // R1 rodado a 90° e com 470 Ω (diferente do valor por defeito).
    store.setState({
      components: actions().components.map((c) =>
        c.id === r && c.kind === 'resistor'
          ? { ...c, rotation: 90, params: { ...c.params, resistance: 470 } }
          : c,
      ),
    })
    const original = actions().components.find((c) => c.id === r)
    if (original === undefined) throw new Error('R1 devia existir')

    const copyId = actions().duplicateComponent(r)
    const copy = actions().components.find((c) => c.id === copyId)
    if (copy?.kind !== 'resistor') throw new Error('a cópia devia ser uma resistência')
    expect(copy.id).not.toBe(r)
    expect(copy.name).toBe('R2')
    expect(copy.params.resistance).toBe(470)
    expect(copy.rotation).toBe(90)
    expect(copy.position).toEqual({ x: original.position.x + 1, y: original.position.y + 1 })
    expect(copy.terminals.map((t) => t.id)).toEqual([`${copy.id}:a`, `${copy.id}:b`])
    expect(actions().wires).toHaveLength(2) // os fios do original não são copiados
    expect(actions().selectedId).toBe(copy.id)
    expect(original.params).not.toBe(copy.params) // copiados, não partilhados
  })

  it('devolve null para um ID inexistente', () => {
    expect(actions().duplicateComponent('nao-existe')).toBeNull()
    expect(history().pastStates).toHaveLength(0)
  })
})

describe('removeComponent', () => {
  it('apaga o componente e os fios ligados, mantendo os outros fios', () => {
    const { v, r, w1, w2 } = sourceAndResistor()
    const lamp = actions().addComponent('lamp', { x: 8, y: 0 })
    const w3 = actions().addWire(`${v}:+`, `${lamp}:a`)
    expect([w1, w2, w3]).not.toContain(null)

    actions().removeComponent(r)
    expect(actions().components.map((c) => c.id)).toEqual([v, lamp])
    expect(actions().wires.map((w) => w.id)).toEqual([w3])
  })

  it('limpa a seleção se o componente apagado estava selecionado', () => {
    const r1 = actions().addComponent('resistor', { x: 0, y: 0 })
    const r2 = actions().addComponent('resistor', { x: 1, y: 0 })
    actions().select(r1)
    actions().removeComponent(r2)
    expect(actions().selectedId).toBe(r1) // apagou-se outro → a seleção mantém-se
    actions().removeComponent(r1)
    expect(actions().selectedId).toBeNull()
  })

  it('apagar → desfazer: o componente volta com os seus fios', () => {
    const { r, w1, w2 } = sourceAndResistor()
    const before = actions().components
    actions().removeComponent(r)
    expect(actions().wires).toHaveLength(0)
    history().undo()
    expect(actions().components).toEqual(before)
    expect(actions().wires.map((w) => w.id)).toEqual([w1, w2])
  })
})

describe('addWire / removeWire', () => {
  it('liga dois terminais existentes e apaga o fio', () => {
    const { v, r, w1, w2 } = sourceAndResistor()
    expect(actions().wires[0]).toMatchObject({ id: w1, from: `${v}:+`, to: `${r}:a` })
    if (w1 === null) throw new Error('o fio devia ter sido criado')
    actions().removeWire(w1)
    expect(actions().wires.map((w) => w.id)).toEqual([w2])
  })

  it('recusa terminais inexistentes, o mesmo terminal e fios repetidos (nos dois sentidos)', () => {
    const { v, r } = sourceAndResistor()
    const pastBefore = history().pastStates.length
    const refused: [TerminalId, TerminalId][] = [
      [`${v}:+`, 'fantasma:a'],
      ['fantasma:a', `${r}:a`],
      [`${r}:x`, `${v}:+`], // o componente existe, o terminal não
      [`${v}:+`, `${v}:+`], // de um terminal para ele próprio
      [`${v}:+`, `${r}:a`], // repetido
      [`${r}:a`, `${v}:+`], // repetido, no sentido inverso
    ]
    for (const [from, to] of refused) {
      expect(actions().addWire(from, to)).toBeNull()
    }
    expect(actions().wires).toHaveLength(2)
    expect(history().pastStates).toHaveLength(pastBefore) // nada gravado no histórico
  })
})

describe('seleção e histórico', () => {
  it('selecionar não grava passos no histórico', () => {
    const r = actions().addComponent('resistor', { x: 0, y: 0 })
    const past = history().pastStates.length
    actions().select(null)
    actions().select(r)
    expect(actions().selectedId).toBe(r)
    expect(history().pastStates).toHaveLength(past)
  })

  it('o histórico não guarda a seleção', () => {
    actions().addComponent('resistor', { x: 0, y: 0 })
    actions().addComponent('resistor', { x: 1, y: 0 })
    expect(history().pastStates.length).toBeGreaterThan(0)
    for (const state of history().pastStates) {
      expect(Object.keys(state).sort()).toEqual(['components', 'wires'])
    }
  })

  it('desfazer → refazer repõe o estado', () => {
    const r = actions().addComponent('resistor', { x: 0, y: 0 })
    actions().moveComponent(r, { x: 3, y: 3 })
    history().undo()
    expect(actions().components[0]?.position).toEqual({ x: 0, y: 0 })
    expect(history().futureStates).toHaveLength(1)
    history().redo()
    expect(actions().components[0]?.position).toEqual({ x: 3, y: 3 })
    expect(history().futureStates).toHaveLength(0)
  })

  it('desfazer a criação do componente selecionado limpa a seleção', () => {
    actions().addComponent('resistor', { x: 0, y: 0 })
    history().undo()
    expect(actions().components).toHaveLength(0)
    expect(actions().selectedId).toBeNull()
  })

  it(`limita o histórico a ${HISTORY_LIMIT} passos`, () => {
    const r = actions().addComponent('resistor', { x: 0, y: 0 })
    for (let i = 1; i <= HISTORY_LIMIT + 20; i++) actions().moveComponent(r, { x: i, y: 0 })
    expect(history().pastStates).toHaveLength(HISTORY_LIMIT)
  })
})

describe('seleção de fios', () => {
  /** R1 e R2 com um fio R1:b → R2:a. */
  function twoResistorsWithWire() {
    const r1 = store.getState().addComponent('resistor', { x: 0, y: 0 })
    const r2 = store.getState().addComponent('resistor', { x: 4, y: 0 })
    const wire = store.getState().addWire(`${r1}:b` as TerminalId, `${r2}:a` as TerminalId)
    if (!wire) throw new Error('fio recusado')
    return { r1, r2, wire }
  }

  it('selecionar um fio tira a seleção do componente, e vice-versa', () => {
    const { r1, wire } = twoResistorsWithWire()
    store.getState().selectWire(wire)
    expect(store.getState()).toMatchObject({ selectedWireId: wire, selectedId: null })
    store.getState().select(r1)
    expect(store.getState()).toMatchObject({ selectedWireId: null, selectedId: r1 })
  })

  it('apagar o fio selecionado limpa a seleção; Ctrl+Z repõe o fio', () => {
    const { wire } = twoResistorsWithWire()
    store.getState().selectWire(wire)
    store.getState().removeWire(wire)
    expect(store.getState().wires).toHaveLength(0)
    expect(store.getState().selectedWireId).toBeNull()
    store.temporal.getState().undo()
    expect(store.getState().wires.map((w) => w.id)).toEqual([wire])
  })

  it('apagar um componente tira a seleção do fio que estava ligado a ele', () => {
    const { r2, wire } = twoResistorsWithWire()
    store.getState().selectWire(wire)
    store.getState().removeComponent(r2)
    expect(store.getState().selectedWireId).toBeNull()
  })

  it('selecionar um fio não grava passos no histórico', () => {
    const { wire } = twoResistorsWithWire()
    const steps = store.temporal.getState().pastStates.length
    store.getState().selectWire(wire)
    store.getState().selectWire(null)
    expect(store.temporal.getState().pastStates.length).toBe(steps)
  })
})
