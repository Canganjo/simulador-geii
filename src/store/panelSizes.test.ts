import { beforeEach, describe, expect, it } from 'vitest'
import { clampPanelSize, PANEL_LIMITS } from './panelSizes'
import { useUiStore } from './uiStore'

describe('clampPanelSize', () => {
  it('deixa passar um tamanho dentro dos limites (arredondado ao píxel)', () => {
    expect(clampPanelSize('menu', 300)).toBe(300)
    expect(clampPanelSize('menu', 300.6)).toBe(301)
  })

  it('não deixa passar abaixo do mínimo nem acima do máximo', () => {
    expect(clampPanelSize('menu', 10)).toBe(PANEL_LIMITS.menu.min) // 180
    expect(clampPanelSize('menu', 5000)).toBe(PANEL_LIMITS.menu.max) // 480
    expect(clampPanelSize('properties', -50)).toBe(PANEL_LIMITS.properties.min) // 200
  })

  it('aceita um máximo mais pequeno (resultados ≤ 60 % da janela)', () => {
    // Janela com 500 px de altura → máximo 300 px
    expect(clampPanelSize('results', 450, 500 * 0.6)).toBe(300)
    // …mas nunca abaixo do mínimo, mesmo numa janela minúscula
    expect(clampPanelSize('results', 450, 20)).toBe(PANEL_LIMITS.results.min)
  })

  it('um valor que não é um número volta ao tamanho por defeito', () => {
    expect(clampPanelSize('results', Number.NaN)).toBe(PANEL_LIMITS.results.default)
  })

  it('os tamanhos por defeito estão dentro dos limites', () => {
    for (const { default: d, min, max } of Object.values(PANEL_LIMITS)) {
      expect(d).toBeGreaterThanOrEqual(min)
      expect(d).toBeLessThanOrEqual(max)
    }
  })
})

describe('uiStore — tamanhos dos painéis', () => {
  beforeEach(() => {
    for (const panel of ['menu', 'properties', 'results'] as const) {
      useUiStore.getState().resetPanelSize(panel)
    }
  })

  it('setPanelSize muda o tamanho e respeita os limites', () => {
    useUiStore.getState().setPanelSize('menu', 320)
    expect(useUiStore.getState().sizes.menu).toBe(320)
    useUiStore.getState().setPanelSize('menu', 9999)
    expect(useUiStore.getState().sizes.menu).toBe(480)
  })

  it('resetPanelSize volta ao tamanho por defeito sem mexer nos outros', () => {
    useUiStore.getState().setPanelSize('menu', 400)
    useUiStore.getState().setPanelSize('results', 250)
    useUiStore.getState().resetPanelSize('menu')
    expect(useUiStore.getState().sizes).toMatchObject({ menu: 240, results: 250 })
  })

  it('recolher e reabrir um painel não perde o tamanho', () => {
    useUiStore.getState().setPanelSize('properties', 400)
    useUiStore.getState().toggleProperties()
    useUiStore.getState().toggleProperties()
    expect(useUiStore.getState().sizes.properties).toBe(400)
  })
})
