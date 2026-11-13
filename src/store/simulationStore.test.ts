import { beforeEach, describe, expect, it } from 'vitest'
import { useCircuitStore } from './circuitStore'
import { useSimulationStore } from './simulationStore'

const circuit = () => useCircuitStore.getState()
const simulation = () => useSimulationStore.getState()

beforeEach(() => {
  useCircuitStore.setState({ components: [], wires: [], selectedId: null, selectedWireId: null })
  useSimulationStore.setState({ result: null })
})

/** Muda um parâmetro diretamente no estado (a edição de valores ainda não existe na interface). */
function setParam(id: string, param: string, value: number) {
  useCircuitStore.setState((s) => ({
    components: s.components.map((c) =>
      c.id === id ? ({ ...c, params: { ...c.params, [param]: value } } as typeof c) : c,
    ),
  }))
}

/**
 * Teste 6 da planilha: V1 = 12 V ── R1 = 470 Ω ── LED D1 (Vf = 2 V) ── GND
 *   I = (12 − 2) / 470 = 0,021277 A = 21,28 mA
 *   U(R1) = 470 × 0,021277 = 10 V · U(D1) = 2 V · P(D1) = 2 × 0,021277 = 42,55 mW
 */
function test6() {
  const v = circuit().addComponent('dc-source', { x: 0, y: 0 })
  const r = circuit().addComponent('resistor', { x: 4, y: 0 })
  const d = circuit().addComponent('led', { x: 8, y: 0 })
  const g = circuit().addComponent('ground', { x: 0, y: 4 })
  setParam(r, 'resistance', 470)
  circuit().addWire(`${v}:+`, `${r}:a`)
  circuit().addWire(`${r}:b`, `${d}:anodo`)
  circuit().addWire(`${d}:catodo`, `${g}:gnd`)
  circuit().addWire(`${g}:gnd`, `${v}:-`)
  return { v, r, d }
}

describe('simulationStore', () => {
  it('começa sem resultados', () => {
    expect(simulation().result).toBeNull()
  })

  it('run() calcula o circuito atual: teste 6 da planilha → 21,28 mA', () => {
    const { r, d } = test6()
    simulation().run()
    const result = simulation().result
    if (!result?.ok) throw new Error('a simulação devia funcionar')
    expect(result.results.get(r)?.current).toBeCloseTo(0.021277, 5)
    expect(result.results.get(r)?.voltage).toBeCloseTo(10, 6)
    expect(result.results.get(d)?.voltage).toBeCloseTo(2, 6)
    expect(result.results.get(d)?.power).toBeCloseTo(0.042553, 5)
    expect(result.results.get(d)?.ledState).toBe('on')
  })

  it('sem fonte nem GND → erros, sem resultados', () => {
    circuit().addComponent('resistor', { x: 0, y: 0 })
    simulation().run()
    const result = simulation().result
    expect(result?.ok).toBe(false)
    expect(result?.issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(['no-source', 'no-ground']),
    )
  })

  it('clear() limpa os resultados (Parar / RAZ)', () => {
    test6()
    simulation().run()
    simulation().clear()
    expect(simulation().result).toBeNull()
  })

  it('mexer no circuito limpa os resultados; mudar só a seleção não', () => {
    const { r } = test6()
    simulation().run()
    circuit().select(null)
    expect(simulation().result).not.toBeNull()

    circuit().moveComponent(r, { x: 5, y: 1 })
    expect(simulation().result).toBeNull()
  })
})
