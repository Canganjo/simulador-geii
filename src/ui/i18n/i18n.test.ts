import { describe, expect, it } from 'vitest'
import { CATALOG, COMPONENT_CATEGORIES } from '../../core/library'
import { formatSi } from '../formatSi'
import {
  decimalSeparator,
  detectLanguage,
  DICTIONARIES,
  isMessageKey,
  LANGUAGES,
  translate,
} from '.'
import { pt } from './pt'

/** Os `{nome}` de um texto, ordenados (para comparar entre línguas). */
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('dicionários', () => {
  it.each(LANGUAGES)('%s tem exatamente as mesmas chaves que o português', (language) => {
    expect(Object.keys(DICTIONARIES[language]).sort()).toEqual(Object.keys(pt).sort())
  })

  it.each(LANGUAGES)('%s: nenhum texto vazio e os mesmos {marcadores}', (language) => {
    for (const [key, text] of Object.entries(DICTIONARIES[language])) {
      expect(text.trim(), key).not.toBe('')
      expect(placeholders(text), key).toEqual(placeholders(pt[key as keyof typeof pt]))
    }
  })

  it('todos os componentes, categorias e parâmetros do catálogo têm tradução', () => {
    for (const definition of Object.values(CATALOG)) {
      expect(isMessageKey(`kind.${definition.kind}`), definition.kind).toBe(true)
      for (const param of Object.keys(definition.params)) {
        expect(isMessageKey(`param.${param}`), param).toBe(true)
      }
    }
    for (const category of COMPONENT_CATEGORIES) {
      expect(isMessageKey(`category.${category}`), category).toBe(true)
    }
  })
})

describe('translate', () => {
  it('escolhe a língua', () => {
    expect(translate('pt', 'kind.resistor')).toBe('Resistência')
    expect(translate('fr', 'kind.resistor')).toBe('Résistance')
    expect(translate('en', 'kind.resistor')).toBe('Resistor')
  })

  it('substitui {name}; um marcador sem valor fica como está', () => {
    expect(translate('en', 'account.label', { name: 'Ana' })).toBe('Account: Ana')
    expect(translate('en', 'account.label')).toBe('Account: {name}')
  })
})

describe('detectLanguage', () => {
  it.each([
    [['fr-FR', 'en'], 'fr'],
    [['en-US'], 'en'],
    [['pt-BR'], 'pt'],
    [['de-DE', 'en-GB'], 'en'], // alemão não existe → a seguinte da lista
    [['de-DE'], 'pt'], // nenhuma conhecida → português
    [[], 'pt'],
  ] as const)('%j → %s', (preferred, expected) => {
    expect(detectLanguage(preferred)).toBe(expected)
  })
})

describe('números por língua', () => {
  it('vírgula em pt/fr, ponto em en: 0,0212766 A → 21,3 mA / 21.3 mA', () => {
    expect(formatSi(0.0212766, 'A', 3, decimalSeparator('pt'))).toBe('21,3 mA')
    expect(formatSi(0.0212766, 'A', 3, decimalSeparator('fr'))).toBe('21,3 mA')
    expect(formatSi(0.0212766, 'A', 3, decimalSeparator('en'))).toBe('21.3 mA')
  })
})
