import type { Component, ComponentKind, Rotation, Terminal, TerminalId, Vec2 } from '../model'
import { CATALOG } from './catalog'

/** O componente concreto de um tipo: `ComponentOf<'resistor'>` tem `params.resistance`. */
export type ComponentOf<K extends ComponentKind> = Extract<Component, { kind: K }>

export interface CreateComponentOptions {
  /** Componentes que já existem no projeto (para escolher um nome livre: R1, R2…). */
  existing?: readonly Pick<Component, 'name'>[]
  rotation?: Rotation
  /** Gerador de IDs. Por defeito `crypto.randomUUID()`; nos testes pode ser fixo. */
  newId?: () => string
}

/**
 * Cria uma nova instância de um componente do catálogo.
 *
 * - ID único e estável (não muda se o nome mudar).
 * - Nome = prefixo + (maior número já usado + 1): R1, R2, R3…
 *   Se R2 for apagado, o próximo continua a ser R4 (como no LTspice: os nomes não "saltam").
 * - Terminais com ID "<idDoComponente>:<nome>", ex.: "c7:+".
 * - Parâmetros COPIADOS do catálogo (alterar um componente não altera os outros).
 */
export function createComponent<K extends ComponentKind>(
  kind: K,
  position: Vec2,
  options: CreateComponentOptions = {},
): ComponentOf<K> {
  const definition = CATALOG[kind]
  const id = (options.newId ?? defaultId)()

  const terminals: Terminal[] = definition.terminals.map(({ name }) => ({
    id: `${id}:${name}` satisfies TerminalId,
    componentId: id,
    name,
  }))

  const component = {
    id,
    kind,
    name: nextName(definition.namePrefix, options.existing ?? []),
    position: { x: position.x, y: position.y },
    rotation: options.rotation ?? 0,
    terminals,
    params: { ...definition.defaultParams },
  }
  // O TypeScript não consegue provar sozinho que `params` corresponde a `kind` num genérico;
  // a correspondência é garantida pelo tipo de CATALOG.
  return component as unknown as ComponentOf<K>
}

/** Próximo nome livre para um prefixo: ["R1", "R3", "V1"] + "R" → "R4". */
export function nextName(prefix: string, existing: readonly Pick<Component, 'name'>[]): string {
  const pattern = new RegExp(`^${escapeRegExp(prefix)}(\\d+)$`)
  let max = 0
  for (const { name } of existing) {
    const match = pattern.exec(name)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `${prefix}${max + 1}`
}

function defaultId(): string {
  return crypto.randomUUID()
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
