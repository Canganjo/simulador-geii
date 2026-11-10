import { beforeEach, describe, expect, it } from 'vitest'
import { useCircuitStore } from '../store/circuitStore'
import { startComponentDrag } from './dragComponent'

const history = () => useCircuitStore.temporal.getState()
const position = (id: string) =>
  useCircuitStore.getState().components.find((c) => c.id === id)?.position

beforeEach(() => {
  useCircuitStore.setState({ components: [], wires: [], selectedId: null, selectedWireId: null })
  history().clear()
})

describe('startComponentDrag', () => {
  it('o componente segue o rato de ponto em ponto da grelha', () => {
    const id = useCircuitStore.getState().addComponent('resistor', { x: 0, y: 0 })
    const drag = startComponentDrag(id, { x: 0, y: 0 })
    drag?.moveTo({ x: 2.3, y: -0.8 })
    expect(position(id)).toEqual({ x: 2, y: -1 })
    drag?.end()
  })

  it('mantém o ponto onde se agarrou (não salta para debaixo do rato)', () => {
    // Agarrado 0,8 à direita do centro: o centro fica 0,8 à esquerda do rato.
    const id = useCircuitStore.getState().addComponent('resistor', { x: 0, y: 0 })
    const drag = startComponentDrag(id, { x: 0.8, y: 0 })
    drag?.moveTo({ x: 3.8, y: 0 }) // 3,8 − 0,8 = 3
    expect(position(id)).toEqual({ x: 3, y: 0 })
    drag?.end()
  })

  it('um arrasto inteiro = UM só passo de Desfazer', () => {
    const id = useCircuitStore.getState().addComponent('resistor', { x: 0, y: 0 })
    const stepsBefore = history().pastStates.length

    const drag = startComponentDrag(id, { x: 0, y: 0 })
    for (const x of [1, 2, 3, 4, 5]) drag?.moveTo({ x, y: 0 }) // passa por 5 células
    drag?.end()

    expect(position(id)).toEqual({ x: 5, y: 0 })
    expect(history().pastStates.length).toBe(stepsBefore + 1)
    history().undo()
    expect(position(id)).toEqual({ x: 0, y: 0 }) // um Ctrl+Z volta ao início
  })

  it('agarrar e largar sem mexer não grava nenhum passo', () => {
    const id = useCircuitStore.getState().addComponent('lamp', { x: 1, y: 1 })
    const stepsBefore = history().pastStates.length
    const drag = startComponentDrag(id, { x: 1, y: 1 })
    drag?.moveTo({ x: 1.2, y: 0.9 }) // continua na mesma célula
    drag?.end()
    expect(history().pastStates.length).toBe(stepsBefore)
  })

  it('componente que não existe → null', () => {
    expect(startComponentDrag('nao-existe', { x: 0, y: 0 })).toBeNull()
  })
})
