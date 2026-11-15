import { buildNodes } from '../core/graph'
import type { Project, TerminalId } from '../core/model'
import { GROUND_NODE } from '../core/netlist'

/**
 * Texto da etiqueta de debug de cada terminal (opção "Nós", etapa E3).
 *
 * Os números vêm de `buildNodes`, o mesmo grafo que o motor de cálculo usa: o que se vê na
 * cena é exatamente o nó da matriz MNA. Nó 0 = GND. Um terminal sem nenhum fio mostra "–"
 * (não está ligado a nada), exceto o do GND, que é sempre o nó 0.
 */
export function nodeLabels(
  project: Pick<Project, 'components' | 'wires'>,
): ReadonlyMap<TerminalId, string> {
  const { nodeOf, looseTerminals } = buildNodes(project)
  const loose = new Set(looseTerminals)
  const labels = new Map<TerminalId, string>()
  for (const [terminal, node] of nodeOf) {
    labels.set(terminal, loose.has(terminal) && node !== GROUND_NODE ? '–' : String(node))
  }
  return labels
}
