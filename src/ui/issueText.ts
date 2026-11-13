import type { SimulationIssue } from '../core/solver'
import { formatSi } from './formatSi'
import { isMessageKey, type MessageKey, type Translate } from './i18n'

/**
 * Escreve uma mensagem do motor (erro/aviso) na língua escolhida.
 *
 * O core devolve um `code` (ex.: 'loose-terminal') e os dados (`params`: { name: 'R1',
 * terminal: 'b' }); aqui escolhe-se o texto do dicionário e preenchem-se os {marcadores}.
 * Se faltarem os dados (versão antiga do core), mostra-se a mensagem do core (em português).
 */
export function issueText(issue: SimulationIssue, t: Translate, decimal: ',' | '.'): string {
  const params = issue.params
  if (!params) return issue.message
  const text = (key: MessageKey, vars: Readonly<Record<string, string | number>> = params) =>
    t(key, vars)

  switch (issue.code) {
    case 'source-short':
      return text(params.via === 'switch' ? 'issue.source-short-switch' : 'issue.source-short-wire')
    case 'invalid-params':
      return text('issue.invalid-params', {
        ...params,
        param: translated(`param.${String(params.param)}`, String(params.param), t),
      })
    case 'loose-terminal':
      return text('issue.loose-terminal', {
        ...params,
        terminal: translated(`terminal.${String(params.terminal)}`, String(params.terminal), t),
      })
    case 'led-overcurrent':
      return text('issue.led-overcurrent', {
        ...params,
        current: amps(params.current, decimal),
        max: amps(params.max, decimal),
      })
    default:
      return text(`issue.${issue.code}`)
  }
}

/** Texto do dicionário se a chave existir; senão o valor tal como está (ex.: terminal "a"). */
function translated(key: string, fallback: string, t: Translate): string {
  return isMessageKey(key) ? t(key) : fallback
}

function amps(value: string | number | undefined, decimal: ',' | '.'): string {
  return typeof value === 'number' ? formatSi(value, 'A', 3, decimal) : String(value ?? '')
}
