/**
 * Catálogo dos componentes do MVP (etapa E4).
 *
 * Cada entrada é um "modelo" reutilizável (dossier, secção 7): ao arrastá-lo para a zona livre
 * cria-se uma NOVA instância com `createComponent` — não há stock limitado.
 *
 * Unidades SI em todo o lado (V, A, Ω, W). Os prefixos (mA, kΩ) são só para mostrar na interface.
 * Valores por defeito coerentes com a folha "Testes de referência" da planilha.
 */

import type { ComponentKind, ComponentParamsByKind } from '../model'

/** Categorias do menu, pela ordem em que aparecem. */
export const COMPONENT_CATEGORIES = [
  'Fontes',
  'Passivos',
  'Comando',
  'Semicondutores',
  'Cargas',
  'Instrumentos',
] as const

export type ComponentCategory = (typeof COMPONENT_CATEGORIES)[number]

/**
 * Unidades SI usadas pelos parâmetros ('' = sem unidade, ex.: o coeficiente n do díodo).
 * F = farad (condensador), H = henry (bobina).
 */
export type SiUnit = 'V' | 'A' | 'Ω' | 'W' | 'F' | 'H' | ''

/** Um terminal do catálogo: nome técnico (vai para o ID, ex.: "c3:+") e nome para mostrar. */
export interface TerminalDefinition {
  name: string
  label: string
}

/** Parâmetro numérico com unidade SI e limites válidos (inclusive). */
export interface NumberParamSpec {
  type: 'number'
  label: string
  unit: SiUnit
  min: number
  max: number
  /** O parâmetro pode faltar no componente (ex.: potência nominal, limite de corrente). */
  optional?: boolean
}

export interface BooleanParamSpec {
  type: 'boolean'
  label: string
}

export interface ChoiceParamSpec {
  type: 'choice'
  label: string
  options: readonly string[]
}

export type ParamSpec = NumberParamSpec | BooleanParamSpec | ChoiceParamSpec

export interface ComponentDefinition<K extends ComponentKind = ComponentKind> {
  kind: K
  /** Nome mostrado no menu. */
  label: string
  category: ComponentCategory
  /** Nome de base das instâncias: R → R1, R2, R3… */
  namePrefix: string
  terminals: readonly TerminalDefinition[]
  /** Valores com que cada nova instância começa. */
  defaultParams: ComponentParamsByKind[K]
  /** Descrição (unidade, limites) de cada parâmetro. */
  params: { readonly [P in keyof ComponentParamsByKind[K]]-?: ParamSpec }
}

/** O catálogo: uma definição por tipo de componente. */
export const CATALOG: { readonly [K in ComponentKind]: ComponentDefinition<K> } = {
  'dc-source': {
    kind: 'dc-source',
    label: 'Fonte DC',
    category: 'Fontes',
    namePrefix: 'V',
    terminals: [
      { name: '+', label: '+' },
      { name: '-', label: '−' },
    ],
    // Como uma fonte de laboratório: 12 V com limite de corrente de 3 A (modo CV/CC, D-013).
    defaultParams: { voltage: 12, currentLimit: 3 },
    params: {
      voltage: { type: 'number', label: 'Tensão', unit: 'V', min: 0, max: 1000 },
      currentLimit: {
        type: 'number',
        label: 'Limite de corrente',
        unit: 'A',
        min: 1e-3,
        max: 100,
        optional: true,
      },
    },
  },
  ground: {
    kind: 'ground',
    label: 'GND',
    category: 'Fontes',
    namePrefix: 'GND',
    terminals: [{ name: 'gnd', label: 'GND' }],
    defaultParams: {},
    params: {},
  },
  resistor: {
    kind: 'resistor',
    label: 'Resistência',
    category: 'Passivos',
    namePrefix: 'R',
    terminals: [
      { name: 'a', label: 'a' },
      { name: 'b', label: 'b' },
    ],
    defaultParams: { resistance: 1000, ratedPower: 0.25 },
    params: {
      resistance: { type: 'number', label: 'Resistência', unit: 'Ω', min: 1e-3, max: 1e8 },
      ratedPower: {
        type: 'number',
        label: 'Potência nominal',
        unit: 'W',
        min: 0.01,
        max: 1000,
        optional: true,
      },
    },
  },
  switch: {
    kind: 'switch',
    label: 'Interruptor',
    category: 'Comando',
    namePrefix: 'S',
    terminals: [
      { name: 'a', label: 'a' },
      { name: 'b', label: 'b' },
    ],
    defaultParams: { closed: false },
    params: {
      closed: { type: 'boolean', label: 'Fechado' },
    },
  },
  led: {
    kind: 'led',
    label: 'LED',
    category: 'Semicondutores',
    namePrefix: 'D',
    terminals: [
      { name: 'anodo', label: 'ânodo' },
      { name: 'catodo', label: 'cátodo' },
    ],
    // Modelo simples do MVP: tensão de limiar Vf + resistência série (0 Ω por defeito, como no
    // teste 6 da planilha: (12 − 2) / 470 = 21,28 mA).
    defaultParams: { forwardVoltage: 2, seriesResistance: 0, maxCurrent: 0.02, color: 'vermelho' },
    params: {
      forwardVoltage: {
        type: 'number',
        label: 'Tensão de limiar (Vf)',
        unit: 'V',
        min: 0.5,
        max: 5,
      },
      seriesResistance: {
        type: 'number',
        label: 'Resistência série',
        unit: 'Ω',
        min: 0,
        max: 1000,
      },
      maxCurrent: { type: 'number', label: 'Corrente máxima', unit: 'A', min: 0.001, max: 1 },
      color: {
        type: 'choice',
        label: 'Cor',
        options: ['vermelho', 'verde', 'azul', 'amarelo', 'branco'],
      },
    },
  },
  diode: {
    kind: 'diode',
    label: 'Díodo',
    category: 'Semicondutores',
    namePrefix: 'D',
    terminals: [
      { name: 'anodo', label: 'ânodo' },
      { name: 'catodo', label: 'cátodo' },
    ],
    // 1N4148 (modelos SPICE habituais): cerca de 0,65 V a 4 mA. Ver D-009.
    defaultParams: { saturationCurrent: 2.52e-9, emissionCoefficient: 1.752 },
    params: {
      saturationCurrent: {
        type: 'number',
        label: 'Corrente de saturação (Is)',
        unit: 'A',
        min: 1e-18,
        max: 1e-3,
      },
      emissionCoefficient: {
        type: 'number',
        label: 'Coeficiente de emissão (n)',
        unit: '',
        min: 0.5,
        max: 4,
      },
    },
  },
  capacitor: {
    kind: 'capacitor',
    label: 'Condensador',
    category: 'Passivos',
    namePrefix: 'C',
    terminals: [
      { name: 'a', label: 'a' },
      { name: 'b', label: 'b' },
    ],
    // 100 µF com 1 kΩ → τ = R·C = 0,1 s (carga visível em meio segundo). Descarregado.
    defaultParams: { capacitance: 100e-6, initialVoltage: 0 },
    params: {
      capacitance: { type: 'number', label: 'Capacidade', unit: 'F', min: 1e-12, max: 1 },
      initialVoltage: {
        type: 'number',
        label: 'Tensão inicial',
        unit: 'V',
        min: -1000,
        max: 1000,
      },
    },
  },
  inductor: {
    kind: 'inductor',
    label: 'Bobina',
    category: 'Passivos',
    // L como nas normas (partilhado com a lâmpada: os nomes continuam únicos, L1, L2…)
    namePrefix: 'L',
    terminals: [
      { name: 'a', label: 'a' },
      { name: 'b', label: 'b' },
    ],
    // 10 mH com 10 Ω → τ = L/R = 1 ms. Sem corrente no início.
    defaultParams: { inductance: 10e-3, initialCurrent: 0 },
    params: {
      inductance: { type: 'number', label: 'Indutância', unit: 'H', min: 1e-9, max: 100 },
      initialCurrent: {
        type: 'number',
        label: 'Corrente inicial',
        unit: 'A',
        min: -100,
        max: 100,
      },
    },
  },
  lamp: {
    kind: 'lamp',
    label: 'Lâmpada',
    category: 'Cargas',
    namePrefix: 'L',
    terminals: [
      { name: 'a', label: 'a' },
      { name: 'b', label: 'b' },
    ],
    // 12 V / 1 W → R = U² / P = 144 Ω quando ligada à tensão nominal
    defaultParams: { ratedVoltage: 12, ratedPower: 1 },
    params: {
      ratedVoltage: { type: 'number', label: 'Tensão nominal', unit: 'V', min: 0.1, max: 1000 },
      ratedPower: { type: 'number', label: 'Potência nominal', unit: 'W', min: 0.01, max: 10000 },
    },
  },
  voltmeter: {
    kind: 'voltmeter',
    label: 'Voltímetro',
    category: 'Instrumentos',
    // VM1, VM2… (V sozinho já é das fontes)
    namePrefix: 'VM',
    terminals: [
      { name: '+', label: '+' },
      { name: '-', label: '−' },
    ],
    // Liga-se em PARALELO com o que se quer medir. Sem parâmetros: 10 MΩ fixos (D-016).
    defaultParams: {},
    params: {},
  },
  ammeter: {
    kind: 'ammeter',
    label: 'Amperímetro',
    category: 'Instrumentos',
    namePrefix: 'AM',
    terminals: [
      { name: '+', label: '+' },
      { name: '-', label: '−' },
    ],
    // Liga-se em SÉRIE (o circuito passa por dentro dele). Sem parâmetros: 1 mΩ fixo (D-016).
    defaultParams: {},
    params: {},
  },
}

/** Lista das definições, agrupadas por categoria e pela ordem do menu. */
export function catalogByCategory(): {
  category: ComponentCategory
  items: ComponentDefinition[]
}[] {
  const all = Object.values(CATALOG) as ComponentDefinition[]
  return COMPONENT_CATEGORIES.map((category) => ({
    category,
    items: all.filter((d) => d.category === category),
  })).filter((group) => group.items.length > 0)
}
