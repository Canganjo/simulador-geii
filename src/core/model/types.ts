/**
 * Tipos base do modelo do circuito.
 *
 * Cada objeto visível tem duas partes (dossier, secção 10):
 *  - uma parte LÓGICA (estes tipos), que o motor de cálculo lê;
 *  - uma parte VISUAL (src/scene), que só desenha o que está aqui.
 *
 * Unidades SI em todo o lado: V, A, Ω, W. Posições em unidades da grelha.
 */

/** Tipos de componente do MVP. */
export type ComponentKind = 'dc-source' | 'ground' | 'resistor' | 'switch' | 'led' | 'lamp'

/** Posição no plano da zona livre (x para a direita, y para cima), em unidades da grelha. */
export interface Vec2 {
  x: number
  y: number
}

/** Rotação no plano, só em passos de 90°. */
export type Rotation = 0 | 90 | 180 | 270

/**
 * Identificador de um terminal: "<idDoComponente>:<nomeDoTerminal>", ex.: "c3:+".
 * Os fios guardam estes IDs (nunca posições), por isso seguem o componente quando ele se move.
 */
export type TerminalId = `${string}:${string}`

/** Ponto de ligação elétrica de um componente. */
export interface Terminal {
  id: TerminalId
  componentId: string
  /** Nome local do terminal: "+", "-", "a", "b", "anodo", "catodo", "gnd". */
  name: string
}

/** Parâmetros elétricos de cada tipo de componente. */
export interface ComponentParamsByKind {
  'dc-source': { voltage: number }
  ground: Record<string, never>
  resistor: { resistance: number; ratedPower?: number }
  switch: { closed: boolean }
  /** Modelo simples do MVP: tensão de limiar + resistência série. */
  led: { forwardVoltage: number; seriesResistance: number; maxCurrent: number; color: string }
  /** A lâmpada comporta-se como uma resistência R = U² / P (valores nominais). */
  lamp: { ratedVoltage: number; ratedPower: number }
}

interface ComponentBase<K extends ComponentKind> {
  /** Identificador único e estável (não muda ao mudar o nome). */
  id: string
  kind: K
  /** Nome visível: R1, V1, D1, L1, S1… */
  name: string
  position: Vec2
  rotation: Rotation
  terminals: Terminal[]
  params: ComponentParamsByKind[K]
}

/**
 * Um componente colocado na zona livre.
 * É uma "união discriminada": ao testar `component.kind === 'resistor'`,
 * o TypeScript sabe que `component.params.resistance` existe.
 */
export type Component = { [K in ComponentKind]: ComponentBase<K> }[ComponentKind]

/** Fio entre dois terminais. */
export interface Wire {
  id: string
  from: TerminalId
  to: TerminalId
  /** Pontos intermédios (cotovelos) para desenhar fios ortogonais. Opcional. */
  waypoints?: Vec2[]
}

/** Versão atual do formato dos ficheiros de projeto (ver docs/decisoes.md, D-004). */
export const PROJECT_FORMAT_VERSION = 1

/** Um projeto completo, tal como é guardado em JSON. */
export interface Project {
  version: typeof PROJECT_FORMAT_VERSION
  name: string
  components: Component[]
  wires: Wire[]
  /** Datas em formato ISO 8601. */
  createdAt: string
  updatedAt: string
}
