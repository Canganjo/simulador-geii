import { describe, expect, it } from 'vitest'
import {
  BASE_SHEET,
  dragDelta,
  pageDelta,
  rangeOf,
  sheetRange,
  thumb,
  viewRange,
} from './scrollbars'

describe('barras de deslocamento', () => {
  it('o que se vê: 1280 px com zoom 64 → 20 quadrados, centrados na vista', () => {
    const v = viewRange(0, 1280, 64)
    expect(v.min).toBeCloseTo(-10)
    expect(v.max).toBeCloseTo(10)
    // Eixo z com a câmara inclinada: 640 px / 64 = 10 → 10 / 0,5 = 20 quadrados de chão.
    const z = viewRange(3, 640, 64, 0.5)
    expect(z.min).toBeCloseTo(-7)
    expect(z.max).toBeCloseTo(13)
  })

  it('folha = base ∪ (componentes + margem 6) ∪ vista', () => {
    const view = { min: -10, max: 10 }
    expect(sheetRange(BASE_SHEET.x, null, view)).toEqual({ min: -30, max: 30 })
    // Um componente em x = 50 alarga a folha até 56.
    expect(sheetRange(BASE_SHEET.x, rangeOf([0, 50]), view)).toEqual({ min: -30, max: 56 })
    // A vista longe da origem também conta (nunca fica fora da barra).
    expect(sheetRange(BASE_SHEET.x, null, { min: 40, max: 60 })).toEqual({ min: -30, max: 60 })
  })

  it('cursor: tamanho = vista / folha; posição = início da vista na folha', () => {
    // Folha de 60, vista de 20 no meio → cursor com 1/3 do comprimento, a começar em 1/3.
    const t = thumb({ min: -10, max: 10 }, { min: -30, max: 30 })
    expect(t.size).toBeCloseTo(1 / 3)
    expect(t.start).toBeCloseTo(1 / 3)
    // Vista maior do que a folha → cursor ocupa a barra toda.
    expect(thumb({ min: -50, max: 50 }, { min: -30, max: 30 })).toEqual({ start: 0, size: 1 })
  })

  it('arrastar o cursor: 100 px numa barra de 600 px de uma folha de 60 → a vista anda 10', () => {
    expect(dragDelta(100, 600, { min: -30, max: 30 })).toBeCloseTo(10)
    expect(dragDelta(-60, 600, { min: -30, max: 30 })).toBeCloseTo(-6)
    expect(dragDelta(10, 0, { min: -30, max: 30 })).toBe(0)
  })

  it('clique na calha: anda 80 % da vista, sem passar da ponta da folha', () => {
    const sheet = { min: -30, max: 30 }
    expect(pageDelta({ min: -10, max: 10 }, sheet, 1)).toBeCloseTo(16)
    expect(pageDelta({ min: -10, max: 10 }, sheet, -1)).toBeCloseTo(-16)
    // Perto da ponta direita só anda o que falta (30 − 25 = 5).
    expect(pageDelta({ min: 5, max: 25 }, sheet, 1)).toBeCloseTo(5)
    expect(pageDelta({ min: 10, max: 30 }, sheet, 1)).toBe(0)
  })
})
