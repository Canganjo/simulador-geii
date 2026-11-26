/**
 * Corrente em cada FIO, a partir das correntes dos componentes (lei dos nós, KCL).
 *
 * O solver MNA dá a corrente de cada componente, mas não a de cada fio: para ele, todos os
 * terminais ligados por fios são um único nó (os fios são ideais, 0 Ω). Para animar a corrente
 * nos fios é preciso saber como ela se reparte DENTRO de cada nó.
 *
 * Ideia:
 *   1. Cada componente "injeta" corrente nos fios por um terminal e "retira-a" pelo outro.
 *      Ex.: uma resistência com 4 mA de a para b retira 4 mA do fio ligado em a e injeta 4 mA
 *      no fio ligado em b. A fonte faz o contrário: injeta pelo + e retira pelo −.
 *   2. Os fios de um nó formam um pequeno grafo (vértices = terminais, arestas = fios).
 *      Se esse grafo for uma árvore, a KCL em cada terminal dá a corrente de cada fio, sem
 *      escolha possível.
 *   3. Se houver fios a mais (uma malha só de fios), a KCL não chega: a corrente podia dar
 *      voltas sem fim. Escolhe-se então a repartição de um fio REAL: cada fio tem uma
 *      resistência pequena, proporcional ao comprimento, e a corrente divide-se como num
 *      divisor de corrente. Numa árvore isto dá exatamente o mesmo que a KCL.
 *   4. Os símbolos GND estão todos ligados à mesma "terra" (um vértice extra, invisível).
 *      A corrente que sobra num nó com GND vai para a terra pelos fios do GND.
 *
 * Contas: para cada grupo de fios ligados resolve-se L · φ = injeções, em que L é a matriz de
 * condutâncias dos fios (laplaciana do grafo). A corrente no fio i→j é g · (φi − φj).
 * Como tudo é linear, calcula-se uma vez a matriz "injeções → correntes nos fios" (modelo) e
 * depois, em cada instante do transitório, basta uma soma pesada (rápido, para a animação).
 *
 * Unidades SI: A. Sinal: corrente positiva = do terminal `from` para o terminal `to` do fio,
 * no sentido convencional (do + para o −).
 */

import type { Component, Project, TerminalId, Wire } from '../model'

/** Comprimento mínimo considerado para um fio (em células da grelha): evita dividir por 0. */
const MIN_WIRE_LENGTH = 0.5
/** Pesos abaixo disto são arredondamentos: não se guardam. */
const WEIGHT_EPSILON = 1e-12

/** De onde vem a injeção de um terminal: corrente do componente × sinal. */
export interface TerminalSource {
  terminal: TerminalId
  /** null = terminal de GND (não injeta: a terra é a referência). */
  componentId: string | null
  /** +1: a corrente do componente SAI por este terminal para os fios; −1: entra. */
  sign: 1 | -1
}

/** A corrente de um fio é Σ pesos[k] · injeção(terminais[k]). */
export interface WireFlow {
  wireId: string
  /** Índices em `WireFlowModel.sources`. */
  terms: readonly number[]
  weights: readonly number[]
}

/** Matriz "injeções nos terminais → corrente em cada fio". Só depende da topologia. */
export interface WireFlowModel {
  sources: readonly TerminalSource[]
  wires: readonly WireFlow[]
}

export interface WireFlowOptions {
  /** Comprimento de cada fio (células da grelha). Por omissão todos medem 1. */
  length?: (wire: Wire) => number
}

/**
 * Sinal da injeção de cada terminal (ver o ponto 1 acima).
 * Convenções do simulateDc: fonte → corrente fornecida (sai pelo +); outros → do 1.º terminal
 * (a, ânodo, +) para o 2.º (b, cátodo, −).
 */
function terminalSigns(component: Component): (1 | -1)[] {
  if (component.kind === 'dc-source') return [1, -1]
  return [-1, 1]
}

/** Constrói o modelo de um projeto. Fios com terminais inexistentes ou em curto consigo próprios são ignorados. */
export function buildWireFlowModel(
  project: Pick<Project, 'components' | 'wires'>,
  options: WireFlowOptions = {},
): WireFlowModel {
  const sources: TerminalSource[] = []
  const indexOf = new Map<TerminalId, number>()
  const groundIndices: number[] = []
  for (const c of project.components) {
    const signs = terminalSigns(c)
    c.terminals.forEach((t, k) => {
      indexOf.set(t.id, sources.length)
      if (c.kind === 'ground') groundIndices.push(sources.length)
      sources.push({
        terminal: t.id,
        componentId: c.kind === 'ground' ? null : c.id,
        sign: signs[k] ?? 1,
      })
    })
  }

  // Grafo: vértices 0 … n−1 = terminais, vértice n = a terra.
  const earth = sources.length
  interface Edge {
    a: number
    b: number
    g: number
    wireId: string | null
  }
  const edges: Edge[] = []
  for (const w of project.wires) {
    const a = indexOf.get(w.from)
    const b = indexOf.get(w.to)
    if (a === undefined || b === undefined || a === b) continue
    const length = Math.max(options.length?.(w) ?? 1, MIN_WIRE_LENGTH)
    edges.push({ a, b, g: 1 / length, wireId: w.id })
  }
  for (const gnd of groundIndices) edges.push({ a: gnd, b: earth, g: 1, wireId: null })

  // Grupos de vértices ligados por arestas (cada grupo resolve-se à parte: matrizes pequenas).
  const groups = connectedGroups(earth + 1, edges)
  const flows: WireFlow[] = []
  for (const group of groups) {
    const groupEdges = edges.filter((e) => group.has(e.a))
    if (!groupEdges.some((e) => e.wireId !== null)) continue
    flows.push(...solveGroup([...group], groupEdges, earth))
  }
  // Pela ordem dos fios no projeto (estável).
  const order = new Map(project.wires.map((w, i) => [w.id, i]))
  flows.sort((x, y) => (order.get(x.wireId) ?? 0) - (order.get(y.wireId) ?? 0))
  return { sources, wires: flows }
}

/**
 * Um grupo de fios ligados: escolhe a referência (terra, se estiver no grupo; senão o 1.º
 * terminal), inverte a matriz de condutâncias e tira os pesos de cada fio.
 */
function solveGroup(
  vertices: number[],
  edges: readonly { a: number; b: number; g: number; wireId: string | null }[],
  earth: number,
): WireFlow[] {
  const reference = vertices.includes(earth) ? earth : Math.min(...vertices)
  const unknowns = vertices.filter((v) => v !== reference).sort((x, y) => x - y)
  const row = new Map(unknowns.map((v, i) => [v, i]))
  const n = unknowns.length

  // Matriz de condutâncias (laplaciana sem a linha/coluna da referência).
  const L: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0))
  for (const { a, b, g } of edges) {
    const i = row.get(a)
    const j = row.get(b)
    if (i !== undefined) L[i][i] += g
    if (j !== undefined) L[j][j] += g
    if (i !== undefined && j !== undefined) {
      L[i][j] -= g
      L[j][i] -= g
    }
  }
  // φ = L⁻¹ · injeções. A coluna k de L⁻¹ é o potencial com 1 A injetado no terminal k.
  const inverse = invert(L)

  const flows: WireFlow[] = []
  for (const { a, b, g, wireId } of edges) {
    if (wireId === null) continue
    const i = row.get(a)
    const j = row.get(b)
    const terms: number[] = []
    const weights: number[] = []
    for (const [vertex, k] of row) {
      if (vertex === earth) continue
      // Corrente a→b com 1 A injetado em `vertex`: g · (φa − φb).
      const phiA = i === undefined ? 0 : (inverse[i]?.[k] ?? 0)
      const phiB = j === undefined ? 0 : (inverse[j]?.[k] ?? 0)
      const weight = g * (phiA - phiB)
      if (Math.abs(weight) > WEIGHT_EPSILON) {
        terms.push(vertex)
        weights.push(weight)
      }
    }
    flows.push({ wireId, terms, weights })
  }
  return flows
}

/**
 * Correntes nos fios para um conjunto de correntes de componentes (em A), pela ordem de
 * `model.wires`. Positivo = do `from` para o `to` do fio. Componente sem valor → 0 A.
 */
export function wireCurrentsAt(
  model: WireFlowModel,
  currentOf: (componentId: string) => number | undefined,
): Map<string, number> {
  const out = new Float64Array(model.wires.length)
  wireCurrentsInto(model, currentOf, new Float64Array(model.sources.length), out)
  const result = new Map<string, number>()
  model.wires.forEach((flow, i) => result.set(flow.wireId, out[i] ?? 0))
  return result
}

/**
 * O mesmo que `wireCurrentsAt`, mas escreve em vetores já criados (`out[i]` = fio
 * `model.wires[i]`) e não cria nenhum objeto: é o que a animação chama a cada imagem.
 * `injection` é um vetor de trabalho com `model.sources.length` posições.
 */
export function wireCurrentsInto(
  model: WireFlowModel,
  currentOf: (componentId: string) => number | undefined,
  injection: Float64Array,
  out: Float64Array,
): void {
  model.sources.forEach((s, k) => {
    injection[k] = s.componentId === null ? 0 : s.sign * (currentOf(s.componentId) ?? 0)
  })
  model.wires.forEach((flow, i) => {
    let current = 0
    for (let k = 0; k < flow.terms.length; k++) {
      current += (flow.weights[k] ?? 0) * (injection[flow.terms[k] ?? -1] ?? 0)
    }
    out[i] = current + 0 // + 0: −0 → 0
  })
}

/** Atalho: modelo + resultados de uma simulação DC (ou do último instante do transitório). */
export function wireCurrents(
  project: Pick<Project, 'components' | 'wires'>,
  results: ReadonlyMap<string, { current: number }>,
  options: WireFlowOptions = {},
): Map<string, number> {
  return wireCurrentsAt(buildWireFlowModel(project, options), (id) => results.get(id)?.current)
}

/** Grupos de vértices ligados por arestas (union-find simples). */
function connectedGroups(count: number, edges: readonly { a: number; b: number }[]): Set<number>[] {
  const parent = Array.from({ length: count }, (_, i) => i)
  const find = (x: number): number => {
    let r = x
    while (parent[r] !== r) r = parent[r] ?? r
    parent[x] = r
    return r
  }
  for (const { a, b } of edges) parent[find(a)] = find(b)
  const groups = new Map<number, Set<number>>()
  for (const { a, b } of edges) {
    for (const v of [a, b]) {
      const root = find(v)
      let set = groups.get(root)
      if (!set) groups.set(root, (set = new Set()))
      set.add(v)
    }
  }
  return [...groups.values()]
}

/**
 * Inversa de uma matriz por Gauss-Jordan com pivotagem parcial (como o gauss.ts, mas com a
 * identidade inteira à direita). A laplaciana de um grupo ligado, sem a referência, é sempre
 * invertível (simétrica e definida positiva).
 */
function invert(A: readonly (readonly number[])[]): number[][] {
  const n = A.length
  const M = A.map((line, i) => [...line, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))])
  for (let k = 0; k < n; k++) {
    let pivot = k
    for (let r = k + 1; r < n; r++) {
      if (Math.abs(M[r]?.[k] ?? 0) > Math.abs(M[pivot]?.[k] ?? 0)) pivot = r
    }
    const pivotRow = M[pivot]
    const currentRow = M[k]
    if (!pivotRow || !currentRow) continue
    M[pivot] = currentRow
    M[k] = pivotRow
    const p = pivotRow[k] ?? 0
    if (p === 0) continue // não acontece num grupo ligado
    for (let c = 0; c < 2 * n; c++) pivotRow[c] = (pivotRow[c] ?? 0) / p
    for (let r = 0; r < n; r++) {
      const line = M[r]
      if (r === k || !line) continue
      const f = line[k] ?? 0
      if (f === 0) continue
      for (let c = 0; c < 2 * n; c++) line[c] = (line[c] ?? 0) - f * (pivotRow[c] ?? 0)
    }
  }
  return M.map((line) => line.slice(n))
}
