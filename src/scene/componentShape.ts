import type { ComponentKind, Vec2 } from '../core/model'

/** Tamanho da caixa de um componente [comprimento, altura, largura], em células da grelha. */
export function boxSize(kind: ComponentKind): [number, number, number] {
  return kind === 'ground' ? [0.9, 0.25, 0.9] : [1.6, 0.5, 0.7]
}

/**
 * Altura (na cena) da etiqueta com o nome (R1, D1…): por cima do modelo 3D mais alto
 * (os modelos chegam a 0,8 de altura, ver public/models/LEIAME.md), para não tapar o LED/a lâmpada.
 */
export function labelHeight(kind: ComponentKind): number {
  return kind === 'ground' ? boxSize(kind)[1] + 0.3 : 1.05
}

/**
 * Onde fica a etiqueta (no plano, antes de rodar), em relação ao centro do componente.
 * A do GND fica AO LADO do símbolo: por cima tapava o terminal (que está em Y = +1).
 */
export function labelBase(kind: ComponentKind): Vec2 {
  return kind === 'ground' ? { x: 0.9, y: -0.5 } : { x: 0, y: 0 }
}
