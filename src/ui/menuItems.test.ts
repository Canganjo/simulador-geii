import { describe, expect, it } from 'vitest'
import { COMPONENT_CATEGORIES, CATALOG } from '../core/library'
import type { ComponentKind } from '../core/model'
import { translate } from './i18n'
import { CATEGORY_STYLE, defaultSummary } from './menuItems'

const pt = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) =>
  translate('pt', key, vars)
const en = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) =>
  translate('en', key, vars)

describe('defaultSummary (linha pequena do menu, a partir do catálogo)', () => {
  it.each([
    ['dc-source', '12 V · 3 A'],
    ['resistor', '1 kΩ'],
    ['capacitor', '100 µF'],
    ['inductor', '10 mH'],
    ['led', '2 V · 20 mA'],
    ['lamp', '12 V · 1 W'],
    ['ground', 'referência 0 V'],
    ['switch', 'aberto'],
    ['diode', 'Si · 1N4148'],
  ] as const)('%s → "%s"', (kind, expected) => {
    expect(defaultSummary(kind, pt, ',')).toBe(expected)
  })

  it('usa a língua e o separador decimal escolhidos', () => {
    expect(defaultSummary('switch', en, '.')).toBe('open')
    // 100 µF continua igual; um valor com casas decimais muda de separador
    expect(defaultSummary('capacitor', en, '.')).toBe('100 µF')
  })

  it('todos os tipos do catálogo têm um texto (nenhum fica vazio)', () => {
    for (const kind of Object.keys(CATALOG) as ComponentKind[]) {
      expect(defaultSummary(kind, pt, ',')).not.toBe('')
    }
  })
})

describe('CATEGORY_STYLE', () => {
  it('cada categoria do menu tem uma cor', () => {
    for (const category of COMPONENT_CATEGORIES) {
      expect(CATEGORY_STYLE[category].symbol).toMatch(/^text-/)
    }
  })
})
