import { beforeEach, describe, expect, it } from 'vitest'
import { useCircuitStore } from '../store/circuitStore'
import { snapLabelOffset, startLabelDrag } from './dragLabel'

const state = () => useCircuitStore.getState()

describe('etiquetas móveis', () => {
  beforeEach(() => {
    useCircuitStore.setState({ components: [], wires: [], selectedId: null, selectedIds: [] })
    useCircuitStore.temporal.getState().clear()
  })

  it('encaixa em quartos de quadrado', () => {
    expect(snapLabelOffset({ x: 0.3, y: -0.6 })).toEqual({ x: 0.25, y: -0.5 })
    expect(snapLabelOffset({ x: -0.1, y: 0.1 })).toEqual({ x: 0, y: 0 })
  })

  it('arrastar muda só a etiqueta, num só passo do desfazer; sítio normal tira o campo', () => {
    const id = state().addComponent('resistor', { x: 2, y: 3 })
    useCircuitStore.temporal.getState().clear()
    const drag = startLabelDrag(id, { x: 2, y: 3 })
    drag?.moveTo({ x: 2.5, y: 3 })
    drag?.moveTo({ x: 3, y: 2 })
    drag?.end()
    const r = state().components[0]
    expect(r?.position).toEqual({ x: 2, y: 3 }) // o componente não mexeu
    expect(r?.labelOffset).toEqual({ x: 1, y: -1 })
    expect(useCircuitStore.temporal.getState().pastStates).toHaveLength(1)

    useCircuitStore.temporal.getState().undo()
    expect(state().components[0]?.labelOffset).toBeUndefined()

    state().moveLabel(id, { x: 0.5, y: 0 })
    state().moveLabel(id, { x: 0, y: 0 })
    expect(state().components[0]).not.toHaveProperty('labelOffset')
  })
})
