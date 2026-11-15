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
