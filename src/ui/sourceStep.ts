/**
 * Botões + / − da fonte DC (como o botão de regulação de uma fonte de bancada).
 *
 *   clique       → ±0,1 V
 *   Shift+clique → ±1 V
 *   manter       → repete (primeiro espera um pouco, depois vai mais depressa)
 *
 * O valor fica sempre dentro dos limites do catálogo (0 V a 1000 V) e arredondado ao passo,
 * para não aparecer 12,299999999 V depois de muitos cliques.
 */

export const SMALL_STEP = 0.1 // V
export const BIG_STEP = 1 // V
/** Espera antes de começar a repetir e intervalo entre repetições (ms). */
export const REPEAT_DELAY = 400
export const REPEAT_INTERVAL = 80

export function stepVoltage(
  value: number,
  direction: 1 | -1,
  big: boolean,
  limits: { min: number; max: number },
): number {
  const step = big ? BIG_STEP : SMALL_STEP
  // Arredondar ao múltiplo de 0,1 V mais perto (evita os erros de vírgula flutuante).
  const next = Math.round((value + direction * step) / SMALL_STEP) * SMALL_STEP
  const rounded = Number(next.toFixed(6))
  return Math.min(limits.max, Math.max(limits.min, rounded))
}
