import type { ComponentKind } from '../model'
import { CATALOG, type ParamSpec } from './catalog'

/** Um problema encontrado num parâmetro. */
export interface ParamIssue {
  /** Nome do parâmetro (ex.: "resistance"). */
  param: string
  reason: 'missing' | 'wrong-type' | 'not-finite' | 'out-of-range' | 'invalid-option'
  /** Mensagem pronta a mostrar, ex.: "R1: Resistência = 0 Ω fora dos limites (0.001 Ω a 100000000 Ω)". */
  message: string
}

/**
 * Verifica os parâmetros de um componente contra o catálogo (tipo, número finito, limites).
 *
 * Recebe `unknown` porque os valores podem vir de um ficheiro JSON ou de um campo de texto.
 * Devolve a lista de problemas (vazia = tudo certo). Os valores ficam em unidades SI; os prefixos
 * (mΩ, MΩ) ficam para a interface (regra 7 do CLAUDE.md).
 */
export function validateParams(
  kind: ComponentKind,
  params: Readonly<Record<string, unknown>>,
  componentName: string = CATALOG[kind].label,
): ParamIssue[] {
  const specs: Readonly<Record<string, ParamSpec>> = CATALOG[kind].params
  const issues: ParamIssue[] = []

  for (const [param, spec] of Object.entries(specs)) {
    const value = params[param]
    const where = `${componentName}: ${spec.label}`
    const issue = (reason: ParamIssue['reason'], message: string) =>
      issues.push({ param, reason, message: `${where} ${message}` })

    if (value === undefined) {
      // A potência nominal da resistência é opcional no modelo; o resto é obrigatório.
      if (!(kind === 'resistor' && param === 'ratedPower')) issue('missing', 'em falta')
      continue
    }

    switch (spec.type) {
      case 'number':
        if (typeof value !== 'number') issue('wrong-type', 'tem de ser um número')
        else if (!Number.isFinite(value)) issue('not-finite', 'tem de ser um número finito')
        else if (value < spec.min || value > spec.max)
          issue(
            'out-of-range',
            `= ${value} ${spec.unit} fora dos limites (${spec.min} ${spec.unit} a ${spec.max} ${spec.unit})`,
          )
        break
      case 'boolean':
        if (typeof value !== 'boolean') issue('wrong-type', 'tem de ser verdadeiro ou falso')
        break
      case 'choice':
        if (typeof value !== 'string' || !spec.options.includes(value))
          issue('invalid-option', `tem de ser uma destas opções: ${spec.options.join(', ')}`)
        break
    }
  }
  return issues
}
