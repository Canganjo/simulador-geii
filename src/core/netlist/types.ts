/**
 * Netlist: a descrição puramente elétrica do circuito, sem posições nem aspeto visual.
 *
 * Nós numerados: 0 = GND (referência, 0 V); 1, 2, 3… = os outros nós.
 * Exemplo do dossier (secção 11): V1 entre N1 e GND; R1 entre N1 e N2; D1 entre N2 e GND.
 */

/** Índice de um nó elétrico. 0 é sempre o GND. */
export type NodeIndex = number

export const GROUND_NODE: NodeIndex = 0

/** Resistência entre dois nós. Também serve para a lâmpada e o interruptor fechado. */
export interface ResistorElement {
  type: 'resistor'
  /** ID do componente de origem (para devolver resultados ao componente certo). */
  id: string
  nodeA: NodeIndex
  nodeB: NodeIndex
  /** Ω, tem de ser > 0. */
  resistance: number
}

/** Fonte de tensão ideal: V(plus) − V(minus) = voltage. */
export interface VoltageSourceElement {
  type: 'voltage-source'
  id: string
  plus: NodeIndex
  minus: NodeIndex
  /** V */
  voltage: number
}

export type NetlistElement = ResistorElement | VoltageSourceElement

export interface Netlist {
  /** Número de nós SEM contar o GND. Os nós válidos são 0..nodeCount. */
  nodeCount: number
  elements: NetlistElement[]
}
