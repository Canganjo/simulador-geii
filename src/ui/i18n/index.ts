import { useCallback } from 'react'
import { useLanguageStore, type Language } from '../../store/languageStore'
import { en } from './en'
import { fr } from './fr'
import { pt, type MessageKey, type Messages } from './pt'

export type { MessageKey, Messages } from './pt'
export { LANGUAGES, detectLanguage, isLanguage, type Language } from '../../store/languageStore'

/** Nome de cada língua NA PRÓPRIA LÍNGUA (é assim que se reconhece num seletor). */
export const LANGUAGE_NAMES: Readonly<Record<Language, string>> = {
  pt: 'Português',
  fr: 'Français',
  en: 'English',
}

export const DICTIONARIES: Readonly<Record<Language, Messages>> = { pt, fr, en }

export function isMessageKey(value: string): value is MessageKey {
  return Object.hasOwn(pt, value)
}

/** Separador decimal de cada língua: 21,3 mA (pt, fr) · 21.3 mA (en). */
export function decimalSeparator(language: Language): ',' | '.' {
  return language === 'en' ? '.' : ','
}

/** Texto `key` na língua pedida, com `{nome}` substituído por `vars.nome`. */
export function translate(
  language: Language,
  key: MessageKey,
  vars: Readonly<Record<string, string | number>> = {},
): string {
  const text = DICTIONARIES[language][key]
  return text.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name]
    return value === undefined ? match : String(value)
  })
}

export type Translate = (
  key: MessageKey,
  vars?: Readonly<Record<string, string | number>>,
) => string

/** Para os componentes React: `const t = useT()` e depois `t('menu.title')`. */
export function useT(): Translate {
  const language = useLanguageStore((s) => s.language)
  return useCallback((key, vars) => translate(language, key, vars), [language])
}
