import { temporal } from 'zundo'
import { create } from 'zustand'
import type {
  Component,
  ComponentKind,
  Project,
  Rotation,
  TerminalId,
  Vec2,
  Wire,
} from '../core/model'
import { createComponent, validateParams, type ParamIssue } from '../core/library'
import { PROJECT_FORMAT_VERSION } from '../core/model'

/**
 * Estado do CIRCUITO: componentes, fios e seleção.
 *
 * Usa o middleware `temporal` do zundo para desfazer/refazer:
 *  - o histórico guarda só `components` e `wires` (a seleção NÃO conta como passo);
 *  - no máximo 100 passos;
 *  - acesso via `useCircuitStore.temporal.getState()`: undo, redo, pastStates, futureStates,
 *    pause, resume (pause/resume servem para um arrasto gravar um só passo), clear.
 *
 * Não é guardado no browser: guardar/abrir projetos será feito em JSON (src/persistence).
 */
export interface CircuitState {
  components: Component[]
  wires: Wire[]
  /** ID do componente selecionado (ou null). */
  selectedId: string | null
  /** ID do fio selecionado (ou null). Só há uma coisa selecionada de cada vez. */
  selectedWireId: string | null
  /** Nome do projeto (vai para o nome do ficheiro ao guardar). */
  projectName: string
  /** Quando o projeto foi criado (ISO 8601); guarda-se no ficheiro. */
  createdAt: string
  /**
   * O circuito tal como estava na última vez que foi guardado/aberto. Se `components` ou `wires`
   * forem outros objetos, há alterações por guardar (ver `hasUnsavedChanges`).
   */
  saved: CircuitHistory

  /** Cria um componente do catálogo (nome livre: R1, R2…), seleciona-o e devolve o seu ID. */
  addComponent: (kind: ComponentKind, position: Vec2) => string
  moveComponent: (id: string, position: Vec2) => void
  /** Roda +90° (270° → 0°). */
  rotateComponent: (id: string) => void
  /** Copia com os mesmos parâmetros, nome e ID novos, posição +1/+1. Os fios não são copiados. */
  duplicateComponent: (id: string) => string | null
  /** Apaga o componente e os fios ligados aos seus terminais. */
  removeComponent: (id: string) => void
  /**
   * Muda parâmetros (ex.: { resistance: 470 }), verificados com o catálogo (validateParams).
   * Devolve os problemas encontrados; se houver algum, NADA muda.
   */
  updateParams: (id: string, changes: Readonly<Record<string, unknown>>) => ParamIssue[]
  /**
   * Muda o nome (ex.: "R1" → "Rcarga"). Devolve null se mudou, ou o motivo da recusa:
   * 'empty' (vazio) ou 'taken' (já há outro componente com esse nome).
   */
  renameComponent: (id: string, name: string) => null | 'empty' | 'taken'
  /** Liga dois terminais. Devolve o ID do fio, ou null se o fio for recusado. */
  addWire: (from: TerminalId, to: TerminalId) => string | null
  removeWire: (id: string) => void
  /** Seleciona um componente (e tira a seleção do fio); null tira tudo. */
  select: (id: string | null) => void
  /** Seleciona um fio (e tira a seleção do componente). */
  selectWire: (id: string | null) => void
  /** Substitui o circuito pelo de um projeto aberto. Limpa a seleção e o histórico (Ctrl+Z). */
  loadProject: (project: Project) => void
  /** Começa um projeto vazio (botão Novo). */
  newProject: () => void
  /** Marca o circuito atual como guardado (depois de descarregar o ficheiro). */
  markSaved: () => void
}

/** Verdadeiro se o circuito mudou desde a última vez que foi guardado ou aberto. */
export function hasUnsavedChanges(state: CircuitState): boolean {
  return state.components !== state.saved.components || state.wires !== state.saved.wires
}

export const DEFAULT_PROJECT_NAME = 'circuito'

/** A parte do estado que entra no histórico de desfazer/refazer. */
export type CircuitHistory = Pick<CircuitState, 'components' | 'wires'>

export const HISTORY_LIMIT = 100

// Os mesmos objetos vazios no estado inicial e em `saved`: um circuito novo não tem alterações.
const EMPTY_COMPONENTS: Component[] = []
const EMPTY_WIRES: Wire[] = []

export const useCircuitStore = create<CircuitState>()(
  temporal(
    (set, get) => ({
      components: EMPTY_COMPONENTS,
      wires: EMPTY_WIRES,
      selectedId: null,
      selectedWireId: null,
      projectName: DEFAULT_PROJECT_NAME,
      createdAt: new Date().toISOString(),
      saved: { components: EMPTY_COMPONENTS, wires: EMPTY_WIRES },

      addComponent: (kind, position) => {
        const component: Component = createComponent(kind, position, {
          existing: get().components,
        })
        set((s) => ({
          components: [...s.components, component],
          selectedId: component.id,
          selectedWireId: null,
        }))
        return component.id
      },

      moveComponent: (id, position) =>
        set((s) => ({
          components: s.components.map((c) =>
            c.id === id ? { ...c, position: { x: position.x, y: position.y } } : c,
          ),
        })),

      rotateComponent: (id) =>
        set((s) => ({
          components: s.components.map((c) =>
            c.id === id ? { ...c, rotation: ((c.rotation + 90) % 360) as Rotation } : c,
          ),
        })),

      updateParams: (id, changes) => {
        const component = get().components.find((c) => c.id === id)
        if (!component) return []
        const params = { ...component.params, ...changes }
        const issues = validateParams(component.kind, params, component.name)
        if (issues.length > 0) return issues
        set((s) => ({
          components: s.components.map((c) =>
            // Seguro: validateParams acabou de confirmar os parâmetros deste tipo de componente.
            c.id === id ? ({ ...c, params } as Component) : c,
          ),
        }))
        return []
      },

      renameComponent: (id, name) => {
        const clean = name.trim()
        if (clean === '') return 'empty'
        const { components } = get()
        const lower = clean.toLowerCase()
        if (components.some((c) => c.id !== id && c.name.toLowerCase() === lower)) return 'taken'
        set((s) => ({
          components: s.components.map((c) => (c.id === id ? { ...c, name: clean } : c)),
        }))
        return null
      },

      duplicateComponent: (id) => {
        const { components } = get()
        const source = components.find((c) => c.id === id)
        if (!source) return null
        const fresh = createComponent(
          source.kind,
          { x: source.position.x + 1, y: source.position.y + 1 },
          { existing: components, rotation: source.rotation },
        )
        // Mesmo tipo → os parâmetros do original servem à cópia (copiados, não partilhados).
        const copy = { ...fresh, params: { ...source.params } } as Component
        set((s) => ({
          components: [...s.components, copy],
          selectedId: copy.id,
          selectedWireId: null,
        }))
        return copy.id
      },

      removeComponent: (id) =>
        set((s) => {
          const prefix = `${id}:`
          const wires = s.wires.filter(
            (w) => !w.from.startsWith(prefix) && !w.to.startsWith(prefix),
          )
          return {
            components: s.components.filter((c) => c.id !== id),
            wires,
            selectedId: s.selectedId === id ? null : s.selectedId,
            selectedWireId: wires.some((w) => w.id === s.selectedWireId) ? s.selectedWireId : null,
          }
        }),

      addWire: (from, to) => {
        const { components, wires } = get()
        if (from === to) return null
        const exists = (t: TerminalId) =>
          components.some((c) => c.terminals.some((term) => term.id === t))
        if (!exists(from) || !exists(to)) return null
        const repeated = wires.some(
          (w) => (w.from === from && w.to === to) || (w.from === to && w.to === from),
        )
        if (repeated) return null
        const wire: Wire = { id: crypto.randomUUID(), from, to }
        set((s) => ({ wires: [...s.wires, wire] }))
        return wire.id
      },

      removeWire: (id) =>
        set((s) => ({
          wires: s.wires.filter((w) => w.id !== id),
          selectedWireId: s.selectedWireId === id ? null : s.selectedWireId,
        })),

      select: (id) => set({ selectedId: id, selectedWireId: null }),
      selectWire: (id) => set({ selectedWireId: id, selectedId: null }),

      loadProject: (project) => {
        const { components, wires } = project
        set({
          components,
          wires,
          projectName: project.name,
          createdAt: project.createdAt,
          saved: { components, wires },
          selectedId: null,
          selectedWireId: null,
        })
        // "Desfazer a abertura" não faz sentido: o histórico começa aqui.
        useCircuitStore.temporal.getState().clear()
      },

      newProject: () =>
        get().loadProject({
          version: PROJECT_FORMAT_VERSION,
          name: DEFAULT_PROJECT_NAME,
          components: EMPTY_COMPONENTS,
          wires: EMPTY_WIRES,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),

      markSaved: () => set((s) => ({ saved: { components: s.components, wires: s.wires } })),
    }),
    {
      partialize: ({ components, wires }): CircuitHistory => ({ components, wires }),
      limit: HISTORY_LIMIT,
      // Só se grava um passo quando os componentes ou os fios mudam (ex.: selecionar não grava).
      equality: (past, current) =>
        past.components === current.components && past.wires === current.wires,
    },
  ),
)

// Se desfazer/refazer fizer desaparecer o componente ou o fio selecionado, limpa a seleção.
// (Este `set` não mexe em componentes nem fios, por isso não grava nenhum passo no histórico.)
useCircuitStore.subscribe((state) => {
  const { selectedId, selectedWireId, components, wires } = state
  if (selectedId !== null && !components.some((c) => c.id === selectedId)) {
    useCircuitStore.setState({ selectedId: null })
  }
  if (selectedWireId !== null && !wires.some((w) => w.id === selectedWireId)) {
    useCircuitStore.setState({ selectedWireId: null })
  }
})
