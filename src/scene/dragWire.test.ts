import { beforeEach, describe, expect, it } from 'vitest'
import { useCircuitStore } from '../store/circuitStore'
import { currentRoute, startWireDrag } from './dragWire'

const store = useCircuitStore
const history = () => useCircuitStore.temporal.getState()

beforeEach(() => {
  store.setState({
    components: [],
    wires: [],
    selectedId: null,
    selectedIds: [],
    selectedWireId: null,
  })
  history().clear()
})

/**
 * R1 em (0,0) e R2 em (6,0): terminais R1:b em (1,0) e R2:a em (5,0).
 * Fio R1:b → R2:a = troço reto (1,0) → (5,0).
 */
function twoResistors() {
  const r1 = store.getState().addComponent('resistor', { x: 0, y: 0 })
  const r2 = store.getState().addComponent('resistor', { x: 6, y: 0 })
  const wire = store.getState().addWire(`${r1}:b`, `${r2}:a`)
  if (wire === null) throw new Error('o fio devia ter sido criado')
  return { r1, r2, wire }
}

describe('startWireDrag', () => {
  it('arrastar o fio reto 2 células para cima → "U" com os terminais no sítio', () => {
    const { wire } = twoResistors()
    const drag = startWireDrag(wire, 0, { x: 3, y: 0 })
    drag?.moveTo({ x: 3.4, y: 1.7 }) // 1,7 → 2 células (o movimento em x não conta)
    drag?.end()
    expect(currentRoute(wire)).toEqual([
      { x: 1, y: 0 },
      { x: 1, y: 2 },
      { x: 5, y: 2 },
      { x: 5, y: 0 },
    ])
    expect(store.getState().wires[0]?.waypoints).toEqual([
      { x: 1, y: 2 },
      { x: 5, y: 2 },
    ])
  })

  it('um arrasto inteiro = UM só passo de Desfazer; Ctrl+Z endireita o fio', () => {
    const { wire } = twoResistors()
    const before = history().pastStates.length
    const drag = startWireDrag(wire, 0, { x: 3, y: 0 })
    for (const y of [1, 2, 3, -1, 2]) drag?.moveTo({ x: 3, y })
    drag?.end()
    expect(history().pastStates.length).toBe(before + 1)
    history().undo()
    expect(store.getState().wires[0]?.waypoints).toBeUndefined()
  })

  it('clicar sem mexer não grava nada', () => {
    const { wire } = twoResistors()
    const before = history().pastStates.length
    const drag = startWireDrag(wire, 0, { x: 3, y: 0 })
    drag?.moveTo({ x: 3.2, y: 0.3 }) // menos de meia célula
    drag?.end()
    expect(history().pastStates.length).toBe(before)
  })

  it('ao mexer um componente, o fio mantém a forma e só a ponta se reajusta', () => {
    const { r2, wire } = twoResistors()
    const drag = startWireDrag(wire, 0, { x: 3, y: 0 })
    drag?.moveTo({ x: 3, y: 2 })
    drag?.end()
    store.getState().moveComponent(r2, { x: 6, y: -1 }) // R2:a passa para (5,−1)
    expect(currentRoute(wire)).toEqual([
      { x: 1, y: 0 },
      { x: 1, y: 2 },
      { x: 5, y: 2 },
      { x: 5, y: -1 },
    ])
  })

  it('"Endireitar fio" (lista vazia) volta ao traçado automático', () => {
    const { wire } = twoResistors()
    const drag = startWireDrag(wire, 0, { x: 3, y: 0 })
    drag?.moveTo({ x: 3, y: 2 })
    drag?.end()
    store.getState().setWireWaypoints(wire, [])
    expect(store.getState().wires[0]).not.toHaveProperty('waypoints')
    expect(currentRoute(wire)).toEqual([
      { x: 1, y: 0 },
      { x: 5, y: 0 },
    ])
  })
})
