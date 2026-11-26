import { beforeEach, describe, expect, it } from 'vitest'
import { useUiStore } from './uiStore'

describe('uiStore — opção de debug "Nós"', () => {
  beforeEach(() => {
    useUiStore.setState({ showNodes: false })
  })

  it('começa desligada', () => {
    expect(useUiStore.getState().showNodes).toBe(false)
  })

  it('toggleNodes liga e volta a desligar', () => {
    useUiStore.getState().toggleNodes()
    expect(useUiStore.getState().showNodes).toBe(true)
    useUiStore.getState().toggleNodes()
    expect(useUiStore.getState().showNodes).toBe(false)
  })
})

describe('uiStore — corrente nos fios', () => {
  beforeEach(() => {
    useUiStore.setState({ showCurrent: false, flowDirection: 'conventional', animationSpeed: 1 })
  })

  it('o botão "Mostrar corrente" liga e desliga', () => {
    useUiStore.getState().toggleCurrent()
    expect(useUiStore.getState().showCurrent).toBe(true)
    useUiStore.getState().toggleCurrent()
    expect(useUiStore.getState().showCurrent).toBe(false)
  })

  it('o sentido troca entre convencional e eletrões', () => {
    useUiStore.getState().setFlowDirection('electron')
    expect(useUiStore.getState().flowDirection).toBe('electron')
  })

  it('a velocidade fica entre 0,25 e 4 (valor estranho → 1)', () => {
    useUiStore.getState().setAnimationSpeed(10)
    expect(useUiStore.getState().animationSpeed).toBe(4)
    useUiStore.getState().setAnimationSpeed(0)
    expect(useUiStore.getState().animationSpeed).toBe(0.25)
    useUiStore.getState().setAnimationSpeed(Number.NaN)
    expect(useUiStore.getState().animationSpeed).toBe(1)
    useUiStore.getState().setAnimationSpeed(2)
    expect(useUiStore.getState().animationSpeed).toBe(2)
  })
})
