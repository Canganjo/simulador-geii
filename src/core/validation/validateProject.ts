/**
 * Validações antes do cálculo (etapa E5, dossier secção 13).
 *
 * Objetivo: o estudante recebe uma mensagem clara ("Falta o GND") em vez de um resultado errado
 * ou de um "matriz singular" do solver.
 *
 *   erro  → o cálculo NÃO pode ser feito (o solver falharia ou daria um disparate);
 *   aviso → o cálculo pode ser feito, mas talvez não seja o que o estudante queria.
 */

import { buildNodes } from '../graph'
import { CATALOG, validateParams } from '../library'
import type { Component, Project } from '../model'
import { GROUND_NODE, type NodeIndex } from '../netlist/types'

export type IssueCode =
  | 'no-source'
  | 'no-ground'
  | 'invalid-wire'
  | 'invalid-params'
  | 'source-short'
  | 'parallel-sources'
  | 'floating-part'
  | 'open-circuit'
  | 'loose-terminal'

export interface ValidationIssue {
  severity: 'error' | 'warning'
  code: IssueCode
  /** Mensagem para o estudante, em português. */
  message: string
  /** Componentes envolvidos (para a cena os poder destacar). */
  componentIds: string[]
}

export interface ValidationResult {
  /** `true` se não houver nenhum ERRO (os avisos não impedem o cálculo). */
  ok: boolean
  issues: ValidationIssue[]
}

export function validateProject(project: Pick<Project, 'components' | 'wires'>): ValidationResult {
  const issues: ValidationIssue[] = []
  const error = (code: IssueCode, message: string, componentIds: string[] = []) =>
    issues.push({ severity: 'error', code, message, componentIds })
  const warning = (code: IssueCode, message: string, componentIds: string[] = []) =>
    issues.push({ severity: 'warning', code, message, componentIds })

  const { components } = project
  const graph = buildNodes(project)
  const node = (c: Component, terminal: string): NodeIndex =>
    graph.nodeOf.get(`${c.id}:${terminal}`) ?? Number.NaN
  const sources = components.filter((c) => c.kind === 'dc-source')

  // 1. O básico: há fonte? há GND?
  if (sources.length === 0) error('no-source', 'Não há nenhuma fonte de tensão no circuito.')
  if (!graph.hasGround) error('no-ground', 'Falta o GND (referência 0 V). Liga um GND ao circuito.')

  // 2. Fios que apontam para terminais que não existem (ex.: ficheiro estragado).
  for (const w of graph.invalidWires) {
    error('invalid-wire', `O fio ${w.id} liga a um terminal que não existe.`)
  }

  // 3. Valores fora dos limites (resistência 0 Ω, tensão negativa…).
  for (const c of components) {
    for (const issue of validateParams(c.kind, c.params, c.name)) {
      error('invalid-params', issue.message, [c.id])
    }
  }

  // 4. Curto-circuito da fonte: + e − no mesmo nó, por um fio ou por um interruptor fechado.
  const viaSwitches = new NodeSets()
  for (const c of components) {
    if (c.kind === 'switch' && c.params.closed) viaSwitches.union(node(c, 'a'), node(c, 'b'))
  }
  const shorted = new Set<string>()
  for (const v of sources) {
    const plus = node(v, '+')
    const minus = node(v, '-')
    if (plus === minus) {
      error(
        'source-short',
        `${v.name} está em curto-circuito: o + e o − estão ligados por um fio.`,
        [v.id],
      )
      shorted.add(v.id)
    } else if (viaSwitches.same(plus, minus)) {
      error(
        'source-short',
        `${v.name} está em curto-circuito: o + e o − estão ligados por um interruptor fechado.`,
        [v.id],
      )
      shorted.add(v.id)
    }
  }

  // 5. Duas fontes entre os mesmos dois nós: o sistema não tem solução única.
  const okSources = sources.filter((v) => !shorted.has(v.id))
  for (let i = 0; i < okSources.length; i++) {
    for (let j = i + 1; j < okSources.length; j++) {
      const a = okSources[i]
      const b = okSources[j]
      if (!a || !b) continue
      const pairA = [node(a, '+'), node(a, '-')].sort((x, y) => x - y).join('-')
      const pairB = [node(b, '+'), node(b, '-')].sort((x, y) => x - y).join('-')
      if (pairA === pairB) {
        error(
          'parallel-sources',
          `${a.name} e ${b.name} estão em paralelo (duas fontes ligadas aos mesmos dois nós).`,
          [a.id, b.id],
        )
      }
    }
  }

  // 6. Partes do circuito sem ligação ao GND → as suas tensões não têm referência.
  //    Junta os nós através de todos os componentes que entram no cálculo (fontes incluídas).
  if (graph.hasGround) {
    const connected = new NodeSets()
    for (const c of components) {
      const [first, ...rest] = c.terminals
      if (!first || !entersCalculation(c)) continue
      for (const t of rest) connected.union(node(c, first.name), node(c, t.name))
    }
    for (const c of components) {
      if (c.kind === 'ground' || !entersCalculation(c)) continue
      if (!c.terminals.some((t) => connected.same(node(c, t.name), GROUND_NODE))) {
        error('floating-part', `${c.name} não está ligado ao resto do circuito com GND.`, [c.id])
      }
    }
  }

  // 7. Circuito aberto: não há nenhum caminho por onde a corrente possa ir do + ao − da fonte.
  //    (Aviso: o cálculo dá I = 0 A, que é o resultado certo — ex.: interruptor aberto.)
  const paths = new NodeSets()
  for (const c of components) {
    if (c.kind === 'dc-source' || c.kind === 'ground' || !entersCalculation(c)) continue
    paths.union(node(c, c.terminals[0]?.name ?? ''), node(c, c.terminals[1]?.name ?? ''))
  }
  for (const v of okSources) {
    if (!paths.same(node(v, '+'), node(v, '-'))) {
      warning('open-circuit', `Circuito aberto: nenhuma corrente sai de ${v.name}.`, [v.id])
    }
  }

  // 8. Pontas soltas: terminais sem nenhum fio.
  const byId = new Map(components.map((c) => [c.id, c]))
  for (const terminalId of graph.looseTerminals) {
    const [componentId = '', terminalName = ''] = terminalId.split(':')
    const c = byId.get(componentId)
    if (!c) continue
    const label =
      CATALOG[c.kind].terminals.find((t) => t.name === terminalName)?.label ?? terminalName
    warning('loose-terminal', `${c.name}: o terminal ${label} não está ligado.`, [c.id])
  }

  return { ok: issues.every((i) => i.severity !== 'error'), issues }
}

/** O interruptor aberto não entra no cálculo (é um corte); os outros componentes entram. */
function entersCalculation(c: Component): boolean {
  return !(c.kind === 'switch' && !c.params.closed)
}

/** Conjuntos de nós (union-find simples): `same(a, b)` diz se estão ligados. */
class NodeSets {
  private readonly parent = new Map<NodeIndex, NodeIndex>()

  find(n: NodeIndex): NodeIndex {
    let root = n
    for (let p = this.parent.get(root); p !== undefined && p !== root; p = this.parent.get(root)) {
      root = p
    }
    if (root !== n) this.parent.set(n, root)
    return root
  }

  union(a: NodeIndex, b: NodeIndex): void {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(rb, ra)
  }

  same(a: NodeIndex, b: NodeIndex): boolean {
    return this.find(a) === this.find(b)
  }
}
