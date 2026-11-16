import { describe, expect, it } from 'vitest'
import { isBodyMaterial, isGlowMaterial, MODEL_FILES, modelUrl } from './models3d'

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
})
