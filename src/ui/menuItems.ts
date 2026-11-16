import { CATALOG, type ComponentCategory } from '../core/library'
import type { ComponentKind } from '../core/model'
import { formatSi } from './formatSi'
import type { Translate } from './i18n'

/**
 * Dados de apresentação do menu de componentes (só interface, nada de cálculo):
 * a linha pequena com o valor por omissão e a cor de cada categoria.
 */

/** Os parâmetros que aparecem por baixo do nome, por esta ordem (valores do catálogo). */
const SUMMARY_PARAMS: { readonly [K in ComponentKind]: readonly string[] } = {
  'dc-source': ['voltage', 'currentLimit'],
  ground: [],
  resistor: ['resistance'],
  switch: [],
  led: ['forwardVoltage', 'maxCurrent'],
  diode: [],
  capacitor: ['capacitance'],
  inductor: ['inductance'],
  lamp: ['ratedVoltage', 'ratedPower'],
  voltmeter: [],
  ammeter: [],
}

/**
 * Texto do valor por omissão: "12 V · 3 A", "1 kΩ", "100 µF"…
 * Componentes sem um valor simples têm um texto próprio (GND = 0 V, interruptor aberto, 1N4148).
 */
export function defaultSummary(kind: ComponentKind, t: Translate, decimal: ',' | '.'): string {
  if (kind === 'ground') return t('menu.summary.ground')
  if (kind === 'switch') return t('menu.summary.switch')
  if (kind === 'diode') return t('menu.summary.diode')
  if (kind === 'voltmeter') return t('menu.summary.voltmeter')
  if (kind === 'ammeter') return t('menu.summary.ammeter')
  const def = CATALOG[kind]
  const params: Readonly<Record<string, unknown>> = def.defaultParams
  const specs: Readonly<Record<string, { type: string; unit?: string }>> = def.params
  return SUMMARY_PARAMS[kind]
    .flatMap((key) => {
      const value = params[key]
      const spec = specs[key]
      if (typeof value !== 'number' || spec?.type !== 'number') return []
      return [formatSi(value, spec.unit ?? '', 3, decimal)]
    })
    .join(' · ')
}

/** Cor de cada categoria (fundo do ícone e traço do símbolo), em classes Tailwind. */
export const CATEGORY_STYLE: Readonly<
  Record<ComponentCategory, { badge: string; symbol: string; heading: string }>
> = {
  Fontes: {
    badge: 'from-amber-400/25 to-amber-600/10 border-amber-400/40',
    symbol: 'text-amber-300',
    heading: 'text-amber-300',
  },
  Passivos: {
    badge: 'from-sky-400/25 to-sky-600/10 border-sky-400/40',
    symbol: 'text-sky-300',
    heading: 'text-sky-300',
  },
  Comando: {
    badge: 'from-violet-400/25 to-violet-600/10 border-violet-400/40',
    symbol: 'text-violet-300',
    heading: 'text-violet-300',
  },
  Semicondutores: {
    badge: 'from-rose-400/25 to-rose-600/10 border-rose-400/40',
    symbol: 'text-rose-300',
    heading: 'text-rose-300',
  },
  Cargas: {
    badge: 'from-emerald-400/25 to-emerald-600/10 border-emerald-400/40',
    symbol: 'text-emerald-300',
    heading: 'text-emerald-300',
  },
  Instrumentos: {
    badge: 'from-lime-400/25 to-lime-600/10 border-lime-400/40',
    symbol: 'text-lime-300',
    heading: 'text-lime-300',
  },
}
