import type { ParamSpec } from '../core/library'
import { formatSi } from './formatSi'
import { isMessageKey, type Translate } from './i18n'

/** Nome do parâmetro na língua escolhida (se faltar a tradução, o nome do catálogo). */
export function paramLabel(key: string, spec: ParamSpec, t: Translate): string {
  const messageKey = `param.${key}`
  return isMessageKey(messageKey) ? t(messageKey) : spec.label
}

/** Um valor para pôr num campo de texto: 4700 → "4,7k" (6 algarismos, para não perder nada). */
export function formatSiInput(value: number, decimal: ',' | '.'): string {
  return formatSi(value, '', 6, decimal).replace(/\s+/g, '')
}
