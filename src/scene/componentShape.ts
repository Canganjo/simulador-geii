import type { ComponentKind } from '../core/model'

/** Tamanho da caixa de um componente [comprimento, altura, largura], em células da grelha. */
export function boxSize(kind: ComponentKind): [number, number, number] {
  return kind === 'ground' ? [0.9, 0.25, 0.9] : [1.6, 0.5, 0.7]
}

/** Altura (na cena) da etiqueta com o nome (R1, D1…): um pouco acima da caixa. */
export function labelHeight(kind: ComponentKind): number {
  return boxSize(kind)[1] + 0.3
}
