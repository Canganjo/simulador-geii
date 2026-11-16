import { describe, expect, it } from 'vitest'
import type { Component } from '../core/model'
import { isBodyMaterial, isGlowMaterial, MODEL_FILES, modelUrl, modelUrlFor } from './models3d'

describe('modelUrl', () => {
  const files = { resistor: 'resistor.glb' }

  it('sem modelo na lista → null (fica a caixa)', () => {
    expect(modelUrl('led', '/', files)).toBeNull()
  })

  it('em pnpm dev a raiz é "/"', () => {
    expect(modelUrl('resistor', '/', files)).toBe('/models/resistor.glb')
  })

  it('no GitHub Pages a raiz é "/simulador-geii/" (com ou sem a barra final)', () => {
    expect(modelUrl('resistor', '/simulador-geii/', files)).toBe(
      '/simulador-geii/models/resistor.glb',
    )
    expect(modelUrl('resistor', '/simulador-geii', files)).toBe(
      '/simulador-geii/models/resistor.glb',
    )
  })

  it('cada ficheiro da lista tem o nome do tipo e acaba em .glb', () => {
    for (const [kind, file] of Object.entries(MODEL_FILES)) {
      expect(file).toBe(`${kind}.glb`)
    }
  })
})

describe('nomes dos materiais do Blender', () => {
  it('"luz" acende-se (também "Luz" e "luz.001")', () => {
    expect(isGlowMaterial('luz')).toBe(true)
    expect(isGlowMaterial('Luz')).toBe(true)
    expect(isGlowMaterial('luz.001')).toBe(true)
    expect(isGlowMaterial('luzes')).toBe(false)
    expect(isGlowMaterial('metal')).toBe(false)
  })

  it('"corpo" recebe a cor do componente', () => {
    expect(isBodyMaterial('corpo')).toBe(true)
    expect(isBodyMaterial('Corpo.002')).toBe(true)
    expect(isBodyMaterial('terminal')).toBe(false)
  })

  it('"corpo-luz" faz as duas coisas (ex.: a cúpula do LED)', () => {
    expect(isGlowMaterial('corpo-luz')).toBe(true)
    expect(isBodyMaterial('corpo-luz')).toBe(true)
    expect(isBodyMaterial('Corpo-Luz.001')).toBe(true)
    expect(isGlowMaterial('corpo')).toBe(false)
    expect(isBodyMaterial('luz')).toBe(false)
  })

  it('os 9 componentes do catálogo têm modelo 3D', () => {
    expect(Object.keys(MODEL_FILES).sort()).toEqual([
      'capacitor',
      'dc-source',
      'diode',
      'ground',
      'inductor',
      'lamp',
      'led',
      'resistor',
      'switch',
    ])
  })

  it('o interruptor aberto usa o seu próprio modelo', () => {
    const sw = (closed: boolean): Component => ({
      id: 's1',
      kind: 'switch',
      name: 'S1',
      position: { x: 0, y: 0 },
      rotation: 0,
      terminals: [],
      params: { closed },
    })
    expect(modelUrlFor(sw(true), '/')).toBe('/models/switch.glb')
    expect(modelUrlFor(sw(false), '/')).toBe('/models/switch-open.glb')
  })
})
