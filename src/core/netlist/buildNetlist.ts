/**
 * Projeto → netlist (etapa E5).
 *
 * Passa do circuito "desenhado" (componentes, terminais, fios) para a descrição puramente
 * elétrica que o solver MNA lê: elementos entre nós numerados (0 = GND).
 *
 *   Fonte DC (CV)       → fonte de tensão entre + e −
 *   Fonte DC (CC)       → fonte de corrente Imax, que sai pelo + (limite de corrente atingido)
 *   Resistência         → resistência R
 *   Lâmpada             → resistência R = U² / P  (12 V / 1 W → 144 Ω)
 *   Interruptor fechado → resistência muito pequena (CLOSED_SWITCH_RESISTANCE)
 *   Interruptor aberto  → não entra (é um corte no circuito)
 *   GND                 → não é um elemento: é o nó 0
 *   LED a conduzir      → fonte Vf (ânodo → cátodo) + resistência Rs em série (se Rs > 0)
 *   LED bloqueado       → não entra (como um interruptor aberto)
 *   Condensador         → DC: não entra (circuito aberto) · transitório: elemento 'capacitor'
 *   Bobina              → DC: fio (resistência de 1 mΩ) · transitório: elemento 'inductor'
 *   Voltímetro          → resistência interna de 10 MΩ (quase não tira corrente ao circuito)
 *   Amperímetro         → shunt de 1 mΩ (quase não tira tensão ao circuito)
 *
 * Quem decide se cada LED conduz é o `simulateDc` (supõe e verifica); aqui só se recebe a lista
 * dos LED bloqueados em `options.ledOff`. O mesmo para as fontes em limitação de corrente
 * (`options.sourceCc`).
 */

import { buildNodes } from '../graph'
import type { Component, Project, TerminalId } from '../model'
import {
  elementNodes,
  GROUND_NODE,
  mapElementNodes,
  type Netlist,
  type NetlistElement,
  type NodeIndex,
} from './types'

/** Resistência de um interruptor fechado: 1 mΩ (o mínimo aceite para uma resistência). */
export const CLOSED_SWITCH_RESISTANCE = 1e-3

/** Resistência interna do voltímetro: 10 MΩ, como num multímetro digital (D-016). */
export const VOLTMETER_RESISTANCE = 10e6

/** Resistência do amperímetro (shunt): 1 mΩ, a mesma de um interruptor fechado (D-016). */
export const AMMETER_RESISTANCE = 1e-3

/** IDs dos elementos de um LED a conduzir: "D1#vf" (fonte Vf) e "D1#rs" (resistência série). */
export const ledSourceId = (componentId: string) => `${componentId}#vf`
export const ledResistorId = (componentId: string) => `${componentId}#rs`

export interface BuildNetlistOptions {
  /** IDs dos LED bloqueados (não conduzem). Os outros são tratados como a conduzir. */
  ledOff?: ReadonlySet<string>
  /**
   * IDs das fontes DC em modo CC (corrente constante = o seu `currentLimit`). As outras ficam em
   * CV (tensão constante). Uma fonte sem `currentLimit` fica sempre em CV.
   */
  sourceCc?: ReadonlySet<string>
  /** 'dc' (por defeito) ou 'transient' (condensadores e bobinas com o seu modelo no tempo). */
  mode?: 'dc' | 'transient'
}

/** Componente que ficou fora da netlist, e porquê. */
export interface SkippedComponent {
  componentId: string
  name: string
  reason: 'open-switch' | 'led-off' | 'capacitor-open'
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
        if (options.sourceCc?.has(c.id) && c.params.currentLimit !== undefined) {
          // A corrente Imax sai pelo + (entra no circuito pelo +, volta pelo −).
          elements.push({
            type: 'current-source',
            id: c.id,
            from: nodeAt(c, '-'),
            to: nodeAt(c, '+'),
            current: c.params.currentLimit,
          })
          break
        }
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
      case 'diode':
        // Díodo real (E10): elemento não linear, resolvido pelo Newton-Raphson (solver/newton.ts).
        elements.push({
          type: 'diode',
          id: c.id,
          anode: nodeAt(c, 'anodo'),
          cathode: nodeAt(c, 'catodo'),
          saturationCurrent: c.params.saturationCurrent,
          emissionCoefficient: c.params.emissionCoefficient,
        })
        break
      case 'capacitor':
        if (options.mode === 'transient') {
          elements.push({
            type: 'capacitor',
            id: c.id,
            nodeA: nodeAt(c, 'a'),
            nodeB: nodeAt(c, 'b'),
            capacitance: c.params.capacitance,
            initialVoltage: c.params.initialVoltage,
          })
        } else {
          skipped.push({ componentId: c.id, name: c.name, reason: 'capacitor-open' })
        }
        break
      case 'inductor':
        if (options.mode === 'transient') {
          elements.push({
            type: 'inductor',
            id: c.id,
            nodeA: nodeAt(c, 'a'),
            nodeB: nodeAt(c, 'b'),
            inductance: c.params.inductance,
            initialCurrent: c.params.initialCurrent,
          })
        } else {
          // Em DC (corrente constante) a bobina é um fio: como um interruptor fechado.
          elements.push(resistor(c, nodeAt(c, 'a'), nodeAt(c, 'b'), CLOSED_SWITCH_RESISTANCE))
        }
        break
      case 'voltmeter':
        elements.push(resistor(c, nodeAt(c, '+'), nodeAt(c, '-'), VOLTMETER_RESISTANCE))
        break
      case 'ammeter':
        elements.push(resistor(c, nodeAt(c, '+'), nodeAt(c, '-'), AMMETER_RESISTANCE))
        break
      case 'ground':
        break // o GND é o nó 0
    }
  }

  // 2. Renumerar: só ficam os nós tocados por algum elemento. Um nó sem elementos (ex.: o lado
  //    de um interruptor aberto que não liga a mais nada) daria uma linha de zeros na matriz
  //    do MNA → matriz singular. O GND continua a ser o 0; os outros ficam 1, 2, 3… seguidos.
  const used = new Set<NodeIndex>()
  for (const e of elements) {
    for (const n of elementNodes(e)) used.add(n)
  }
  const renumber = new Map<NodeIndex, NodeIndex>([[GROUND_NODE, GROUND_NODE]])
  for (const n of [...used].sort((a, b) => a - b)) {
    if (!renumber.has(n)) renumber.set(n, renumber.size)
  }
  const to = (n: NodeIndex): NodeIndex => renumber.get(n) ?? GROUND_NODE

  const netlist: Netlist = {
    nodeCount: renumber.size - 1, // a netlist não conta o GND
    elements: elements.map((e) => mapElementNodes(e, to)),
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
