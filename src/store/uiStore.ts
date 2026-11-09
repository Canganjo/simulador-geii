import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { clampPanelSize, PANEL_LIMITS, type ResizablePanel } from './panelSizes'

/**
 * Estado da INTERFACE (não do circuito): que painéis estão abertos e com que tamanho.
 * Fica guardado no browser, por isso os painéis mantêm-se como o utilizador os deixou.
 */
interface UiState {
  menuOpen: boolean
  propertiesOpen: boolean
  resultsOpen: boolean
  /** Tamanho de cada painel aberto, em px (menu/propriedades: largura; resultados: altura). */
  sizes: Record<ResizablePanel, number>
  toggleMenu: () => void
  toggleProperties: () => void
  toggleResults: () => void
  /** Muda o tamanho de um painel (fica sempre dentro dos limites). */
  setPanelSize: (panel: ResizablePanel, size: number, maxOverride?: number) => void
  /** Volta ao tamanho por defeito. */
  resetPanelSize: (panel: ResizablePanel) => void
}

const DEFAULT_SIZES: Record<ResizablePanel, number> = {
  menu: PANEL_LIMITS.menu.default,
  properties: PANEL_LIMITS.properties.default,
  results: PANEL_LIMITS.results.default,
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      menuOpen: true,
      propertiesOpen: true,
      resultsOpen: true,
      sizes: { ...DEFAULT_SIZES },
      toggleMenu: () => set((s) => ({ menuOpen: !s.menuOpen })),
      toggleProperties: () => set((s) => ({ propertiesOpen: !s.propertiesOpen })),
      toggleResults: () => set((s) => ({ resultsOpen: !s.resultsOpen })),
      setPanelSize: (panel, size, maxOverride) =>
        set((s) => ({
          sizes: { ...s.sizes, [panel]: clampPanelSize(panel, size, maxOverride) },
        })),
      resetPanelSize: (panel) =>
        set((s) => ({ sizes: { ...s.sizes, [panel]: PANEL_LIMITS[panel].default } })),
    }),
    {
      name: 'simulador-geii:interface',
      // Só se guardam os valores, não as funções.
      partialize: ({ menuOpen, propertiesOpen, resultsOpen, sizes }) => ({
        menuOpen,
        propertiesOpen,
        resultsOpen,
        sizes,
      }),
      // Um valor guardado estranho (ficheiro antigo, mexido à mão) volta aos limites.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<UiState>
        const sizes = { ...DEFAULT_SIZES }
        for (const panel of Object.keys(sizes) as ResizablePanel[]) {
          const value = saved.sizes?.[panel]
          if (typeof value === 'number') sizes[panel] = clampPanelSize(panel, value)
        }
        return { ...current, ...saved, sizes }
      },
    },
  ),
)
