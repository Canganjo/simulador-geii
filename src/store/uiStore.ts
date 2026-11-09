import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Estado da INTERFACE (não do circuito): que painéis estão abertos.
 * Fica guardado no browser, por isso os painéis mantêm-se como o utilizador os deixou.
 */
interface UiState {
  menuOpen: boolean
  propertiesOpen: boolean
  resultsOpen: boolean
  toggleMenu: () => void
  toggleProperties: () => void
  toggleResults: () => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      menuOpen: true,
      propertiesOpen: true,
      resultsOpen: true,
      toggleMenu: () => set((s) => ({ menuOpen: !s.menuOpen })),
      toggleProperties: () => set((s) => ({ propertiesOpen: !s.propertiesOpen })),
      toggleResults: () => set((s) => ({ resultsOpen: !s.resultsOpen })),
    }),
    {
      name: 'simulador-geii:interface',
      // Só se guardam os valores, não as funções.
      partialize: ({ menuOpen, propertiesOpen, resultsOpen }) => ({
        menuOpen,
        propertiesOpen,
        resultsOpen,
      }),
    },
  ),
)
