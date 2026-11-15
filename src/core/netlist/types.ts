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

/**
 * Fonte de corrente ideal: empurra `current` amperes do nó `from` para o nó `to`
 * ATRAVÉS da fonte (a corrente sai de `from` e entra em `to`).
 * Usada pelo Newton-Raphson para representar a "reta tangente" de um díodo (E10).
 */
export interface CurrentSourceElement {
  type: 'current-source'
  id: string
  from: NodeIndex
  to: NodeIndex
  /** A */
  current: number
}

/**
 * Díodo real, modelo de Shockley (não linear, E10):
 *   I = Is · (e^(U / (n · Vt)) − 1),  U = V(ânodo) − V(cátodo)
 * Só o solver não linear (`solveDcNonlinear`, Newton-Raphson) sabe resolver este elemento.
 */
export interface DiodeElement {
  type: 'diode'
  id: string
  anode: NodeIndex
  cathode: NodeIndex
  /** Is — corrente de saturação, A (> 0). */
  saturationCurrent: number
  /** n — coeficiente de emissão (1 a 2 nos díodos de silício). */
  emissionCoefficient: number
}

export type NetlistElement =
  ResistorElement | VoltageSourceElement | CurrentSourceElement | DiodeElement

/** Os dois nós a que um elemento está ligado. */
export function elementNodes(e: NetlistElement): [NodeIndex, NodeIndex] {
  switch (e.type) {
    case 'resistor':
      return [e.nodeA, e.nodeB]
    case 'voltage-source':
      return [e.plus, e.minus]
    case 'current-source':
      return [e.from, e.to]
    case 'diode':
      return [e.anode, e.cathode]
  }
}

/** O mesmo elemento com os nós trocados por `f(nó)` (para renumerar). */
export function mapElementNodes<E extends NetlistElement>(e: E, f: (n: NodeIndex) => NodeIndex): E {
  switch (e.type) {
    case 'resistor':
      return { ...e, nodeA: f(e.nodeA), nodeB: f(e.nodeB) }
    case 'voltage-source':
      return { ...e, plus: f(e.plus), minus: f(e.minus) }
    case 'current-source':
      return { ...e, from: f(e.from), to: f(e.to) }
    case 'diode':
      return { ...e, anode: f(e.anode), cathode: f(e.cathode) }
  }
}

export interface Netlist {
  /** Número de nós SEM contar o GND. Os nós válidos são 0..nodeCount. */
  nodeCount: number
  elements: NetlistElement[]
}
