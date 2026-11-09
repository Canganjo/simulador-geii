/**
 * Grafo do circuito: terminais ligados por fios → nós elétricos (etapa E5).
 *
 * Ideia: um fio ideal tem 0 Ω, por isso os dois terminais que liga estão SEMPRE à mesma tensão,
 * ou seja, pertencem ao mesmo nó. Juntando fio a fio, cada "grupo" de terminais ligados é um nó.
 * Para juntar grupos depressa usa-se a estrutura union-find (união de conjuntos).
 *
 * O GND é a referência (0 V): todos os terminais de GND ficam no nó 0.
 */

import type { Project, Terminal, TerminalId, Wire } from '../model'
import { GROUND_NODE, type NodeIndex } from '../netlist'

export interface CircuitNodes {
  /** Nó de cada terminal: "c3:+" → 2. Todos os terminais do projeto estão aqui. */
  nodeOf: ReadonlyMap<TerminalId, NodeIndex>
  /**
   * Número de nós. Com GND: 0 … nodeCount − 1. Sem GND: 1 … nodeCount (não há nó 0).
   */
  nodeCount: number
  /** Terminais de cada nó, ordenados pelo número do nó. */
  nodes: readonly { index: NodeIndex; terminals: readonly TerminalId[] }[]
  /** `false` se não houver nenhum GND (a validação transforma isto num erro). */
  hasGround: boolean
  /** Terminais sem nenhum fio ligado (pontas soltas). */
  looseTerminals: readonly TerminalId[]
  /** Fios que apontam para um terminal que não existe: são ignorados. */
  invalidWires: readonly Wire[]
}

/**
 * Calcula os nós elétricos de um projeto.
 *
 * A numeração é determinística: o mesmo projeto dá sempre os mesmos números
 * (pela ordem dos componentes e dos seus terminais).
 */
export function buildNodes(project: Pick<Project, 'components' | 'wires'>): CircuitNodes {
  // 1. Todos os terminais, pela ordem do projeto.
  const terminals: Terminal[] = project.components.flatMap((c) => c.terminals)
  const groundTerminals = project.components
    .filter((c) => c.kind === 'ground')
    .flatMap((c) => c.terminals.map((t) => t.id))

  const uf = new UnionFind(terminals.map((t) => t.id))

  // 2. Cada fio junta os seus dois terminais.
  const invalidWires: Wire[] = []
  const wired = new Set<TerminalId>()
  for (const wire of project.wires) {
    if (!uf.has(wire.from) || !uf.has(wire.to)) {
      invalidWires.push(wire)
      continue
    }
    uf.union(wire.from, wire.to)
    wired.add(wire.from)
    wired.add(wire.to)
  }

  // 3. Todos os GND são o mesmo nó (a "terra" é uma só, mesmo com vários símbolos).
  const [firstGround, ...otherGrounds] = groundTerminals
  for (const g of otherGrounds) if (firstGround !== undefined) uf.union(firstGround, g)

  // 4. Numerar os grupos: o do GND é o 0; os outros 1, 2, 3… pela ordem em que aparecem.
  const hasGround = firstGround !== undefined
  const indexOfRoot = new Map<TerminalId, NodeIndex>()
  if (firstGround !== undefined) indexOfRoot.set(uf.find(firstGround), GROUND_NODE)
  let next = 1

  const nodeOf = new Map<TerminalId, NodeIndex>()
  const members = new Map<NodeIndex, TerminalId[]>()
  for (const { id } of terminals) {
    const root = uf.find(id)
    let index = indexOfRoot.get(root)
    if (index === undefined) {
      index = next++
      indexOfRoot.set(root, index)
    }
    nodeOf.set(id, index)
    const list = members.get(index)
    if (list) list.push(id)
    else members.set(index, [id])
  }

  const nodes = [...members.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, list]) => ({ index, terminals: list }))

  return {
    nodeOf,
    nodeCount: nodes.length,
    nodes,
    hasGround,
    looseTerminals: terminals.map((t) => t.id).filter((id) => !wired.has(id)),
    invalidWires,
  }
}

/** Union-find com compressão de caminho: `find` devolve o "representante" do grupo. */
class UnionFind {
  private readonly parent = new Map<TerminalId, TerminalId>()

  constructor(ids: readonly TerminalId[]) {
    for (const id of ids) this.parent.set(id, id)
  }

  has(id: TerminalId): boolean {
    return this.parent.has(id)
  }

  find(id: TerminalId): TerminalId {
    let root = id
    for (let p = this.parent.get(root); p !== undefined && p !== root; p = this.parent.get(root)) {
      root = p
    }
    // Compressão: todos os terminais do caminho passam a apontar direto para a raiz.
    let current = id
    while (current !== root) {
      const p = this.parent.get(current)
      this.parent.set(current, root)
      if (p === undefined) break
      current = p
    }
    return root
  }

  union(a: TerminalId, b: TerminalId): void {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(rb, ra)
  }
}
