/**
 * Projeto → netlist (etapa E5).
 *
 * Passa do circuito "desenhado" (componentes, terminais, fios) para a descrição puramente
 * elétrica que o solver MNA lê: elementos entre nós numerados (0 = GND).
 *
 *   Fonte DC            → fonte de tensão entre + e −
 *   Resistência         → resistência R
 *   Lâmpada             → resistência R = U² / P  (12 V / 1 W → 144 Ω)
 *   Interruptor fechado → resistência muito pequena (CLOSED_SWITCH_RESISTANCE)
 *   Interruptor aberto  → não entra (é um corte no circuito)
 *   GND                 → não é um elemento: é o nó 0
 *   LED a conduzir      → fonte Vf (ânodo → cátodo) + resistência Rs em série (se Rs > 0)
 *   LED bloqueado       → não entra (como um interruptor aberto)
 *
 * Quem decide se cada LED conduz é o `simulateDc` (supõe e verifica); aqui só se recebe a lista
 * dos LED bloqueados em `options.ledOff`.
 */

import { buildNodes } from '../graph'
import type { Component, Project, TerminalId } from '../model'
import { GROUND_NODE, type Netlist, type NetlistElement, type NodeIndex } from './types'

/** Resistência de um interruptor fechado: 1 mΩ (o mínimo aceite para uma resistência). */
export const CLOSED_SWITCH_RESISTANCE = 1e-3

/** IDs dos elementos de um LED a conduzir: "D1#vf" (fonte Vf) e "D1#rs" (resistência série). */
export const ledSourceId = (componentId: string) => `${componentId}#vf`
export const ledResistorId = (componentId: string) => `${componentId}#rs`

export interface BuildNetlistOptions {
  /** IDs dos LED bloqueados (não conduzem). Os outros são tratados como a conduzir. */
  ledOff?: ReadonlySet<string>
}

/** Componente que ficou fora da netlist, e porquê. */
export interface SkippedComponent {
  componentId: string
  name: string
  reason: 'open-switch' | 'led-off'
}

export type NetlistResult =
  | {
      ok: true
      netlist: Netlist
      /** Nó (na netlist) de cada terminal. Terminais de nós sem elementos não aparecem. */
      nodeOfTerminal: ReadonlyMap<TerminalId, NodeIndex>
      skipped: readonly SkippedComponent[]
    }
  | { ok: false; reason: 'no-ground' }

export function buildNetlist(
  project: Pick<Project, 'components' | 'wires'>,
  options: BuildNetlistOptions = {},
): NetlistResult {
  const graph = buildNodes(project)
  if (!graph.hasGround) return { ok: false, reason: 'no-ground' }
  // Nós internos (entre Rs e Vf de um LED) ficam depois dos nós do grafo.
  let nextInternalNode = graph.nodeCount

  // Nó (do grafo) de um terminal de um componente.
  const nodeAt = (c: Component, name: string): NodeIndex => {
    const node = graph.nodeOf.get(`${c.id}:${name}`)
    if (node === undefined) throw new Error(`Terminal ${c.id}:${name} em falta no componente`)
    return node
  }

  // 1. Cada componente → elemento(s), ainda com os números de nó do grafo.
  const elements: NetlistElement[] = []
  const skipped: SkippedComponent[] = []
  for (const c of project.components) {
    switch (c.kind) {
      case 'dc-source':
        elements.push({
          type: 'voltage-source',
          id: c.id,
          plus: nodeAt(c, '+'),
          minus: nodeAt(c, '-'),
          voltage: c.params.voltage,
        })
        break
      case 'resistor':
        elements.push(resistor(c, nodeAt(c, 'a'), nodeAt(c, 'b'), c.params.resistance))
        break
      case 'lamp': {
        // P = U² / R  →  R = U² / P
        const { ratedVoltage, ratedPower } = c.params
        elements.push(resistor(c, nodeAt(c, 'a'), nodeAt(c, 'b'), ratedVoltage ** 2 / ratedPower))
        break
      }
      case 'switch':
        if (c.params.closed) {
          elements.push(resistor(c, nodeAt(c, 'a'), nodeAt(c, 'b'), CLOSED_SWITCH_RESISTANCE))
        } else {
          skipped.push({ componentId: c.id, name: c.name, reason: 'open-switch' })
        }
        break
      case 'led': {
        if (options.ledOff?.has(c.id)) {
          skipped.push({ componentId: c.id, name: c.name, reason: 'led-off' })
          break
        }
        //   ânodo ── Rs ──●── (+ Vf −) ── cátodo      (sem Rs: ânodo ── (+ Vf −) ── cátodo)
        const anode = nodeAt(c, 'anodo')
        const cathode = nodeAt(c, 'catodo')
        const { forwardVoltage, seriesResistance } = c.params
        let plus = anode
        if (seriesResistance > 0) {
          plus = nextInternalNode++
          elements.push({
            type: 'resistor',
            id: ledResistorId(c.id),
            nodeA: anode,
            nodeB: plus,
            resistance: seriesResistance,
          })
        }
        elements.push({
          type: 'voltage-source',
          id: ledSourceId(c.id),
          plus,
          minus: cathode,
          voltage: forwardVoltage,
        })
        break
      }
      case 'ground':
        break // o GND é o nó 0
    }
  }

  // 2. Renumerar: só ficam os nós tocados por algum elemento. Um nó sem elementos (ex.: o lado
  //    de um interruptor aberto que não liga a mais nada) daria uma linha de zeros na matriz
  //    do MNA → matriz singular. O GND continua a ser o 0; os outros ficam 1, 2, 3… seguidos.
  const used = new Set<NodeIndex>()
  for (const e of elements) {
    for (const n of e.type === 'resistor' ? [e.nodeA, e.nodeB] : [e.plus, e.minus]) used.add(n)
  }
  const renumber = new Map<NodeIndex, NodeIndex>([[GROUND_NODE, GROUND_NODE]])
  for (const n of [...used].sort((a, b) => a - b)) {
    if (!renumber.has(n)) renumber.set(n, renumber.size)
  }
  const to = (n: NodeIndex): NodeIndex => renumber.get(n) ?? GROUND_NODE

  const netlist: Netlist = {
    nodeCount: renumber.size - 1, // a netlist não conta o GND
    elements: elements.map((e) =>
      e.type === 'resistor'
        ? { ...e, nodeA: to(e.nodeA), nodeB: to(e.nodeB) }
        : { ...e, plus: to(e.plus), minus: to(e.minus) },
    ),
  }

  const nodeOfTerminal = new Map<TerminalId, NodeIndex>()
  for (const [terminal, node] of graph.nodeOf) {
    const n = renumber.get(node)
    if (n !== undefined) nodeOfTerminal.set(terminal, n)
  }

  return { ok: true, netlist, nodeOfTerminal, skipped }
}

function resistor(c: Component, nodeA: NodeIndex, nodeB: NodeIndex, resistance: number) {
  return { type: 'resistor' as const, id: c.id, nodeA, nodeB, resistance }
}
