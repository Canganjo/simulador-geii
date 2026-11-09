/**
 * Tamanhos dos painéis redimensionáveis (em píxeis), como no VS Code:
 * puxa-se a borda de um painel para o tornar mais largo ou mais estreito.
 */

export type ResizablePanel = 'menu' | 'properties' | 'results'

export interface PanelLimits {
  /** Tamanho por defeito (duplo clique na borda volta a este valor). */
  default: number
  min: number
  max: number
}

/** Menu e propriedades: largura. Resultados: altura. */
export const PANEL_LIMITS: Readonly<Record<ResizablePanel, PanelLimits>> = {
  menu: { default: 240, min: 180, max: 480 },
  properties: { default: 256, min: 200, max: 520 },
  results: { default: 160, min: 80, max: 600 },
}

/** Tamanho de um painel recolhido (a faixa estreita com o botão para abrir). */
export const COLLAPSED_SIZE: Readonly<Record<ResizablePanel, number>> = {
  menu: 48,
  properties: 48,
  results: 36,
}

/**
 * Mantém um tamanho dentro dos limites do painel e arredonda ao píxel.
 * `maxOverride` permite um máximo mais pequeno (ex.: resultados ≤ 60 % da altura da janela).
 */
export function clampPanelSize(panel: ResizablePanel, size: number, maxOverride?: number): number {
  const { min, max, default: fallback } = PANEL_LIMITS[panel]
  if (!Number.isFinite(size)) return fallback
  const upper = Math.max(min, Math.min(max, maxOverride ?? max))
  return Math.round(Math.min(upper, Math.max(min, size)))
}
