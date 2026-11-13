import { z } from 'zod'
import { CATALOG, validateParams } from '../core/library'
import {
  PROJECT_FORMAT_VERSION,
  type Component,
  type ComponentKind,
  type Project,
  type Terminal,
  type TerminalId,
} from '../core/model'

/**
 * Ficheiros de projeto `.geii.json` (docs/decisoes.md, D-004 e D-008).
 *
 *   guardar: projeto ──► toProjectFile ──► texto JSON (bonito, com `version` no topo)
 *   abrir:   texto ──► parseProjectFile ──► JSON.parse ──► Zod (forma) ──► regras do circuito
 *
 * Guarda só o circuito (componentes e fios pelos IDs dos terminais), nunca os resultados.
 * Ao abrir, nada é aceite "às cegas": um ficheiro estragado dá um erro claro em vez de partir
 * a aplicação.
 */

export const PROJECT_FILE_EXTENSION = '.geii.json'

const KINDS = Object.keys(CATALOG) as [ComponentKind, ...ComponentKind[]]

const vec2 = z.object({ x: z.number(), y: z.number() })

const componentSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(KINDS),
  name: z.string().trim().min(1).max(40),
  position: vec2,
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  // Os terminais podem vir no ficheiro, mas são sempre refeitos a partir do catálogo.
  terminals: z.array(z.unknown()).optional(),
  params: z.record(z.string(), z.unknown()),
})

const terminalId = z
  .string()
  .regex(/^[^:]+:.+$/, 'tem de ser "<componente>:<terminal>"')
  .transform((s) => s as TerminalId)

const wireSchema = z.object({
  id: z.string().min(1),
  from: terminalId,
  to: terminalId,
  waypoints: z.array(vec2).optional(),
})

const projectSchema = z.object({
  version: z.literal(PROJECT_FORMAT_VERSION),
  name: z.string().trim().min(1).max(80),
  components: z.array(componentSchema),
  wires: z.array(wireSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/**
 * Porque é que um ficheiro foi recusado (a interface escreve a mensagem na língua escolhida):
 *   not-json      → não é JSON (ficheiro de outro tipo, ou cortado a meio);
 *   newer-version → feito por uma versão mais recente do simulador;
 *   invalid       → JSON, mas não é um projeto válido (`detail` diz onde, em português).
 */
export type ProjectFileError =
  | { code: 'not-json' }
  | { code: 'newer-version'; version: number }
  | { code: 'invalid'; detail: string }

export type ProjectFileResult =
  { ok: true; project: Project } | { ok: false; error: ProjectFileError }

/** O texto do ficheiro: JSON com 2 espaços (legível num editor e num diff do Git). */
export function toProjectFile(project: Project): string {
  return `${JSON.stringify(project, null, 2)}\n`
}

export function parseProjectFile(text: string): ProjectFileResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: { code: 'not-json' } }
  }

  // Versão mais recente: mensagem própria (atualizar o simulador), não "ficheiro estragado".
  if (typeof data === 'object' && data !== null && 'version' in data) {
    const { version } = data
    if (typeof version === 'number' && version > PROJECT_FORMAT_VERSION) {
      return { ok: false, error: { code: 'newer-version', version } }
    }
  }

  const parsed = projectSchema.safeParse(data)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const where = first?.path.length ? `${first.path.join('.')}: ` : ''
    return { ok: false, error: { code: 'invalid', detail: `${where}${first?.message ?? ''}` } }
  }

  // Regras que o Zod sozinho não vê: IDs únicos, valores dentro dos limites, fios válidos.
  const raw = parsed.data
  const components: Component[] = []
  const ids = new Set<string>()
  for (const c of raw.components) {
    if (ids.has(c.id)) return invalid(`componente repetido: ${c.id}`)
    ids.add(c.id)
    const problems = validateParams(c.kind, c.params, c.name)
    if (problems[0]) return invalid(problems[0].message)
    const terminals: Terminal[] = CATALOG[c.kind].terminals.map(({ name }) => ({
      id: `${c.id}:${name}` satisfies TerminalId,
      componentId: c.id,
      name,
    }))
    // Seguro: o tipo vem do catálogo e os parâmetros acabaram de ser validados para esse tipo.
    components.push({ ...c, terminals } as Component)
  }

  const terminalIds = new Set(components.flatMap((c) => c.terminals.map((t) => t.id)))
  const wireIds = new Set<string>()
  for (const w of raw.wires) {
    if (wireIds.has(w.id)) return invalid(`fio repetido: ${w.id}`)
    wireIds.add(w.id)
    for (const end of [w.from, w.to]) {
      if (!terminalIds.has(end)) return invalid(`o fio ${w.id} liga a ${end}, que não existe`)
    }
    if (w.from === w.to) return invalid(`o fio ${w.id} liga um terminal a ele próprio`)
  }

  return { ok: true, project: { ...raw, components, wires: raw.wires } }
}

function invalid(detail: string): ProjectFileResult {
  return { ok: false, error: { code: 'invalid', detail } }
}

/** Nome de ficheiro a partir do nome do projeto: "Divisor 12V" → "divisor-12v.geii.json". */
export function projectFileName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // tira acentos: "ç" → "c"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'circuito'}${PROJECT_FILE_EXTENSION}`
}
