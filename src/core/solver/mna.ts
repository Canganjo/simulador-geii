/**
 * Análise nodal modificada (MNA) em regime DC — versão 1: resistências e fontes de tensão.
 *
 * INCÓGNITAS (vetor x):
 *   [ V1, V2, …, Vn,  I_fonte1, I_fonte2, …, I_fontem ]
 *   - Vk = tensão do nó k em relação ao GND (o GND é o nó 0 e não entra no sistema);
 *   - I_fonte = corrente que ENTRA no terminal + da fonte e a atravessa até ao terminal −.
 *     (Uma fonte que alimenta o circuito tem I_fonte NEGATIVA: a corrente sai pelo +.)
 *
 * SISTEMA A · x = b, de tamanho (n + m):
 *
 *        ┌       ┐ ┌   ┐   ┌   ┐
 *        │ G   B │ │ V │   │ 0 │     linhas 1..n : lei dos nós (KCL) em cada nó
 *        │ Bᵀ  0 │ │ I │ = │ E │     linhas n+1..: uma equação por fonte: V(+) − V(−) = E
 *        └       ┘ └   ┘   └   ┘
 *
 * "STAMPS" (o que cada componente acrescenta à matriz):
 *   Resistência R entre a e b, com g = 1/R:
 *       G[a][a] += g   G[a][b] −= g
 *       G[b][a] −= g   G[b][b] += g
 *   Fonte E entre + (p) e − (q), com índice k:
 *       B[p][k] += 1   B[q][k] −= 1     (a corrente da fonte entra na KCL dos seus nós)
 *       Bᵀ[k][p] += 1  Bᵀ[k][q] −= 1   b[n+k] = E
 *   Qualquer linha/coluna do GND (nó 0) é simplesmente ignorada.
 *
 * Convenção de potência: P = U · I em convenção RECETOR.
 *   P > 0 → o componente consome energia (resistência);
 *   P < 0 → o componente fornece energia (fonte a alimentar o circuito).
 *   Num circuito correto, a soma de todas as potências é 0 (conservação da energia).
 */

import { GROUND_NODE, type Netlist, type NodeIndex } from '../netlist'
import { solveLinearSystem } from './gauss'

/** Resultado elétrico de um componente. */
export interface ElementResult {
  /**
   * Tensão aos terminais, em V.
   * Resistência: V(nodeA) − V(nodeB). Fonte: V(+) − V(−).
   */
  voltage: number
  /**
   * Corrente, em A.
   * Resistência: de nodeA para nodeB através dela.
   * Fonte: corrente FORNECIDA ao circuito (sai pelo +). Positiva quando a fonte alimenta.
   */
  current: number
  /** Potência em convenção recetor, em W (P > 0 consome, P < 0 fornece). */
  power: number
}

export type DcSolution =
  | {
      ok: true
      /** nodeVoltages[k] = tensão do nó k; nodeVoltages[0] = 0 (GND). */
      nodeVoltages: number[]
      /** Resultados por ID de componente. */
      elements: Map<string, ElementResult>
    }
  | {
      ok: false
      error: DcSolveError
    }

export type DcSolveError =
  | { code: 'invalid-netlist'; message: string; elementId?: string }
  | { code: 'singular-matrix'; message: string }

/** Resolve um circuito DC linear (resistências + fontes de tensão ideais). */
export function solveDc(netlist: Netlist): DcSolution {
  const invalid = checkNetlist(netlist)
  if (invalid) return { ok: false, error: invalid }

  const n = netlist.nodeCount
  const sources = netlist.elements.filter((e) => e.type === 'voltage-source')
  const size = n + sources.length

  const A: number[][] = Array.from({ length: size }, () => new Array<number>(size).fill(0))
  const b = new Array<number>(size).fill(0)

  /** Linha/coluna da matriz para o nó k (o GND não tem linha → -1). */
  const idx = (node: NodeIndex): number => node - 1
  const add = (r: number, c: number, value: number) => {
    if (r >= 0 && c >= 0) A[r][c] += value
  }

  // Stamps das resistências
  for (const e of netlist.elements) {
    if (e.type !== 'resistor') continue
    const g = 1 / e.resistance
    const a = idx(e.nodeA)
    const c = idx(e.nodeB)
    add(a, a, g)
    add(c, c, g)
    add(a, c, -g)
    add(c, a, -g)
  }

  // Stamps das fontes de tensão
  sources.forEach((e, k) => {
    const row = n + k
    const p = idx(e.plus)
    const q = idx(e.minus)
    add(p, row, 1)
    add(q, row, -1)
    add(row, p, 1)
    add(row, q, -1)
    b[row] = e.voltage
  })

  const result = solveLinearSystem(A, b)
  if (!result.ok) {
    return {
      ok: false,
      error: {
        code: 'singular-matrix',
        message:
          'O circuito não tem solução única: verifica se há um GND, se não há nós soltos ' +
          'e se não há fontes de tensão em paralelo ou em curto-circuito.',
      },
    }
  }

  const nodeVoltages = [0, ...result.x.slice(0, n)]
  const v = (node: NodeIndex) => nodeVoltages[node]
  const elements = new Map<string, ElementResult>()

  for (const e of netlist.elements) {
    if (e.type === 'resistor') {
      const voltage = v(e.nodeA) - v(e.nodeB)
      const current = voltage / e.resistance
      elements.set(e.id, { voltage, current, power: voltage * current })
    }
  }
  sources.forEach((e, k) => {
    const voltage = v(e.plus) - v(e.minus)
    const currentThrough = result.x[n + k] // entra pelo +
    elements.set(e.id, {
      voltage,
      current: -currentThrough, // fornecida ao circuito
      power: voltage * currentThrough,
    })
  })

  return { ok: true, nodeVoltages, elements }
}

/** Verificações básicas da netlist (as validações completas ficam em src/core/validation). */
function checkNetlist(netlist: Netlist): DcSolveError | null {
  const { nodeCount } = netlist
  if (!Number.isInteger(nodeCount) || nodeCount < 0) {
    return { code: 'invalid-netlist', message: `nodeCount inválido: ${nodeCount}` }
  }
  const validNode = (k: NodeIndex) => Number.isInteger(k) && k >= GROUND_NODE && k <= nodeCount
  const ids = new Set<string>()

  for (const e of netlist.elements) {
    if (ids.has(e.id)) {
      return { code: 'invalid-netlist', message: `ID repetido: ${e.id}`, elementId: e.id }
    }
    ids.add(e.id)
    const nodes = e.type === 'resistor' ? [e.nodeA, e.nodeB] : [e.plus, e.minus]
    if (!nodes.every(validNode)) {
      return { code: 'invalid-netlist', message: `${e.id}: nó fora do intervalo`, elementId: e.id }
    }
    if (e.type === 'resistor' && !(Number.isFinite(e.resistance) && e.resistance > 0)) {
      return {
        code: 'invalid-netlist',
        message: `${e.id}: a resistência tem de ser um número > 0 (recebido ${e.resistance})`,
        elementId: e.id,
      }
    }
    if (e.type === 'voltage-source' && !Number.isFinite(e.voltage)) {
      return {
        code: 'invalid-netlist',
        message: `${e.id}: tensão inválida (${e.voltage})`,
        elementId: e.id,
      }
    }
  }
  return null
}
