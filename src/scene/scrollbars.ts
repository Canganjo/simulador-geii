/**
 * Barras de deslocamento da zona livre (como num programa de desenho: LTspice, KiCad…).
 *
 * A grelha é infinita, por isso a "folha" que as barras percorrem é inventada:
 *   folha = (área mínima à volta da origem) ∪ (componentes + margem) ∪ (o que se vê agora).
 * Assim há sempre para onde deslocar, e um componente longe da origem continua ao alcance.
 *
 * Tudo em unidades da CENA, num eixo: x (horizontal, esquerda = mínimo) ou z (vertical,
 * cima = mínimo, longe da câmara). Funções puras, testadas em scrollbars.test.ts.
 */

export interface Range {
  min: number
  max: number
}

/** Área mínima que as barras percorrem, mesmo com a zona livre vazia (quadrados da grelha). */
export const BASE_SHEET = { x: { min: -30, max: 30 }, z: { min: -20, max: 20 } } as const

/** Margem à volta dos componentes (quadrados da grelha). */
export const CONTENT_MARGIN = 6

/**
 * O que se vê num eixo: centro da vista ± metade do tamanho.
 * `pixels / zoom` dá o tamanho no ecrã em unidades; `factor` corrige a inclinação da câmara
 * no eixo z (o chão aparece "encolhido" por cos(inclinação)).
 */
export function viewRange(center: number, pixels: number, zoom: number, factor = 1): Range {
  const half = pixels / zoom / factor / 2
  return { min: center - half, max: center + half }
}

/** Menor intervalo que contém todos os valores (ou null se não houver nenhum). */
export function rangeOf(values: readonly number[]): Range | null {
  if (values.length === 0) return null
  return { min: Math.min(...values), max: Math.max(...values) }
}

/** Folha percorrida pela barra: base ∪ (conteúdo + margem) ∪ vista. */
export function sheetRange(base: Range, content: Range | null, view: Range): Range {
  let min = Math.min(base.min, view.min)
  let max = Math.max(base.max, view.max)
  if (content) {
    min = Math.min(min, content.min - CONTENT_MARGIN)
    max = Math.max(max, content.max + CONTENT_MARGIN)
  }
  return { min, max }
}

/** Posição e tamanho do cursor da barra, em frações (0 a 1) do comprimento da barra. */
export function thumb(view: Range, sheet: Range): { start: number; size: number } {
  const span = sheet.max - sheet.min
  if (span <= 0) return { start: 0, size: 1 }
  const size = Math.min(1, (view.max - view.min) / span)
  const start = Math.min(1 - size, Math.max(0, (view.min - sheet.min) / span))
  return { start, size }
}

/** Arrastar o cursor `pixels` numa barra de `trackPixels` → quanto a vista anda (unidades). */
export function dragDelta(pixels: number, trackPixels: number, sheet: Range): number {
  if (trackPixels <= 0) return 0
  return (pixels / trackPixels) * (sheet.max - sheet.min)
}

/**
 * Clique na calha (fora do cursor): a vista anda uma "página" (80 % do que se vê) para esse lado,
 * sem passar da ponta da folha.
 */
export function pageDelta(view: Range, sheet: Range, direction: -1 | 1): number {
  const step = 0.8 * (view.max - view.min)
  return direction < 0
    ? -Math.min(step, Math.max(0, view.min - sheet.min))
    : Math.min(step, Math.max(0, sheet.max - view.max))
}
