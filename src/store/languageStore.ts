import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Línguas da interface (os textos estão em src/ui/i18n). A primeira é a de recurso. */
export const LANGUAGES = ['pt', 'fr', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value)
}

/**
 * Escolhe a língua a partir das preferências do browser/sistema (ex.: ["fr-FR", "en"]):
 * a primeira que a app conhece; senão, português.
 */
export function detectLanguage(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0]
    if (isLanguage(base)) return base
  }
  return 'pt'
}

/**
 * Língua da interface. Fica guardada no browser; na primeira visita usa a do sistema
 * (navigator.languages), ou português se não for nenhuma das três.
 */
interface LanguageState {
  language: Language
  setLanguage: (language: Language) => void
}

const initial: Language =
  typeof navigator === 'undefined' ? 'pt' : detectLanguage(navigator.languages)

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: initial,
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'simulador-geii:idioma',
      partialize: ({ language }) => ({ language }),
      // Um valor guardado estranho (mexido à mão) é ignorado.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<LanguageState>
        return isLanguage(saved.language) ? { ...current, language: saved.language } : current
      },
    },
  ),
)
