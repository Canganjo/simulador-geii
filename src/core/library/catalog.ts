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
] as const

export type ComponentCategory = (typeof COMPONENT_CATEGORIES)[number]

/** Unidades SI usadas pelos parâmetros. */
export type SiUnit = 'V' | 'A' | 'Ω' | 'W'

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
    defaultParams: { voltage: 12 },
    params: {
      voltage: { type: 'number', label: 'Tensão', unit: 'V', min: 0, max: 1000 },
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
      ratedPower: { type: 'number', label: 'Potência nominal', unit: 'W', min: 0.01, max: 1000 },
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
