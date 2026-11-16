import type { TerminalId, Wire } from '../core/model'

/**
 * Aspeto dos pinos de ligação (terminais), como no LTspice:
 *
 * - `open`: nenhum fio no terminal → quadradinho aberto na ponta da pata ("ainda falta ligar");
 * - `joined`: um fio → o quadrado desaparece e o fio continua a pata;
 * - `junction`: dois ou mais fios → bola cheia (ponto de junção): ali encontram-se 3 ou mais
 *   condutores (a pata + os fios), como os pontos de um esquema elétrico.
 */
export type TerminalMark = 'open' | 'joined' | 'junction'

/** Quantos fios chegam a cada terminal (um fio que liga um terminal a si próprio conta 2). */
export function wireCounts(wires: readonly Pick<Wire, 'from' | 'to'>[]): Map<TerminalId, number> {
  const counts = new Map<TerminalId, number>()
  for (const { from, to } of wires) {
    counts.set(from, (counts.get(from) ?? 0) + 1)
    counts.set(to, (counts.get(to) ?? 0) + 1)
  }
  return counts
}

/** A marca de um terminal a partir do número de fios que lá chegam. */
export function terminalMark(count: number): TerminalMark {
  if (count <= 0) return 'open'
  return count === 1 ? 'joined' : 'junction'
}

/**
 * Realce de um terminal:
 * - `origin`: é o terminal de onde parte o fio que se está a desenhar;
 * - `hover`: o rato está em cima dele;
 * - `target`: está a desenhar-se um fio e este terminal pode recebê-lo;
 * - `none`: nada de especial.
 */
export type TerminalHighlight = 'none' | 'hover' | 'target' | 'origin'

export function terminalHighlight(
  id: TerminalId,
  hovered: boolean,
  wiringFrom: TerminalId | null,
): TerminalHighlight {
  if (id === wiringFrom) return 'origin'
  if (hovered) return 'hover'
  return wiringFrom !== null ? 'target' : 'none'
}
