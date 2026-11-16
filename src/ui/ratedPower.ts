/**
 * Potências nominais das resistências que se compram (série comercial): 1/8, 1/4, 1/2, 1 e 2 W.
 * No painel escolhe-se numa lista, em vez de escrever um número qualquer.
 */
export const RATED_POWERS = [0.125, 0.25, 0.5, 1, 2] as const

const FRACTIONS: Readonly<Record<number, string>> = { 0.125: '1/8', 0.25: '1/4', 0.5: '1/2' }

/** Texto de uma opção: "1/4 W", "1 W"; um valor fora da série (ficheiro antigo) aparece tal como é. */
export function ratedPowerLabel(watts: number, decimal: ',' | '.'): string {
  const fraction = FRACTIONS[watts]
  if (fraction) return `${fraction} W`
  return `${String(watts).replace('.', decimal)} W`
}

/** As opções da lista; se o valor atual não for da série, também aparece (para não o perder). */
export function ratedPowerOptions(current: number | undefined): number[] {
  const list: number[] = [...RATED_POWERS]
  if (current !== undefined && !list.includes(current)) list.push(current)
  return list.sort((a, b) => a - b)
}
