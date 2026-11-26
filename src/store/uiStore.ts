import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FlowDirection } from '../core/wires'
import { clampPanelSize, PANEL_LIMITS, type ResizablePanel } from './panelSizes'

/** Limites do cursor "Velocidade da animação" (1 = normal). */
export const ANIMATION_SPEED_LIMITS = { min: 0.25, max: 4, default: 1 } as const

/** Velocidade da animação sempre dentro dos limites (valor estranho → normal). */
export function clampAnimationSpeed(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return ANIMATION_SPEED_LIMITS.default
  return Math.min(Math.max(value, ANIMATION_SPEED_LIMITS.min), ANIMATION_SPEED_LIMITS.max)
}

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
  /** Opção de debug (E3): mostrar o número do nó elétrico ao lado de cada terminal. */
  showNodes: boolean
  toggleNodes: () => void
  /** Mostrar a corrente nos fios: cargas animadas, cor do fio e valor ao passar o rato. */
  showCurrent: boolean
  toggleCurrent: () => void
  /** Sentido das cargas: convencional (+ → −) ou dos eletrões (− → +). */
  flowDirection: FlowDirection
  setFlowDirection: (direction: FlowDirection) => void
  /** Cursor "Velocidade da animação" (multiplica a velocidade das cargas). */
  animationSpeed: number
  setAnimationSpeed: (speed: number) => void
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
      showNodes: false,
      showCurrent: false,
      flowDirection: 'conventional',
      animationSpeed: ANIMATION_SPEED_LIMITS.default,
      toggleMenu: () => set((s) => ({ menuOpen: !s.menuOpen })),
      toggleProperties: () => set((s) => ({ propertiesOpen: !s.propertiesOpen })),
      toggleResults: () => set((s) => ({ resultsOpen: !s.resultsOpen })),
      setPanelSize: (panel, size, maxOverride) =>
        set((s) => ({
          sizes: { ...s.sizes, [panel]: clampPanelSize(panel, size, maxOverride) },
        })),
      resetPanelSize: (panel) =>
        set((s) => ({ sizes: { ...s.sizes, [panel]: PANEL_LIMITS[panel].default } })),
      toggleNodes: () => set((s) => ({ showNodes: !s.showNodes })),
      toggleCurrent: () => set((s) => ({ showCurrent: !s.showCurrent })),
      setFlowDirection: (flowDirection) => set({ flowDirection }),
      setAnimationSpeed: (speed) => set({ animationSpeed: clampAnimationSpeed(speed) }),
    }),
    {
      name: 'simulador-geii:interface',
      // Só se guardam os valores, não as funções.
      partialize: ({
        menuOpen,
        propertiesOpen,
        resultsOpen,
        sizes,
        showNodes,
        showCurrent,
        flowDirection,
        animationSpeed,
      }) => ({
        menuOpen,
        propertiesOpen,
        resultsOpen,
        sizes,
        showNodes,
        showCurrent,
        flowDirection,
        animationSpeed,
      }),
      // Um valor guardado estranho (ficheiro antigo, mexido à mão) volta aos limites.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<UiState>
        const sizes = { ...DEFAULT_SIZES }
        for (const panel of Object.keys(sizes) as ResizablePanel[]) {
          const value = saved.sizes?.[panel]
          if (typeof value === 'number') sizes[panel] = clampPanelSize(panel, value)
        }
        return {
          ...current,
          ...saved,
          sizes,
          showNodes: saved.showNodes === true,
          showCurrent: saved.showCurrent === true,
          flowDirection: saved.flowDirection === 'electron' ? 'electron' : 'conventional',
          animationSpeed: clampAnimationSpeed(saved.animationSpeed),
        }
      },
    },
  ),
)
