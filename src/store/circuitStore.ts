import { temporal } from 'zundo'
import { create } from 'zustand'
import type { Component, ComponentKind, Rotation, TerminalId, Vec2, Wire } from '../core/model'
import { createComponent } from '../core/library'

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

  /** Cria um componente do catálogo (nome livre: R1, R2…), seleciona-o e devolve o seu ID. */
  addComponent: (kind: ComponentKind, position: Vec2) => string
  moveComponent: (id: string, position: Vec2) => void
  /** Roda +90° (270° → 0°). */
  rotateComponent: (id: string) => void
  /** Copia com os mesmos parâmetros, nome e ID novos, posição +1/+1. Os fios não são copiados. */
  duplicateComponent: (id: string) => string | null
  /** Apaga o componente e os fios ligados aos seus terminais. */
  removeComponent: (id: string) => void
  /** Liga dois terminais. Devolve o ID do fio, ou null se o fio for recusado. */
  addWire: (from: TerminalId, to: TerminalId) => string | null
  removeWire: (id: string) => void
  select: (id: string | null) => void
}

/** A parte do estado que entra no histórico de desfazer/refazer. */
export type CircuitHistory = Pick<CircuitState, 'components' | 'wires'>

export const HISTORY_LIMIT = 100

export const useCircuitStore = create<CircuitState>()(
  temporal(
    (set, get) => ({
      components: [],
      wires: [],
      selectedId: null,

      addComponent: (kind, position) => {
        const component: Component = createComponent(kind, position, {
          existing: get().components,
        })
        set((s) => ({ components: [...s.components, component], selectedId: component.id }))
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
        set((s) => ({ components: [...s.components, copy], selectedId: copy.id }))
        return copy.id
      },

      removeComponent: (id) =>
        set((s) => {
          const prefix = `${id}:`
          return {
            components: s.components.filter((c) => c.id !== id),
            wires: s.wires.filter((w) => !w.from.startsWith(prefix) && !w.to.startsWith(prefix)),
            selectedId: s.selectedId === id ? null : s.selectedId,
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

      removeWire: (id) => set((s) => ({ wires: s.wires.filter((w) => w.id !== id) })),

      select: (id) => set({ selectedId: id }),
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

// Se desfazer/refazer fizer desaparecer o componente selecionado, limpa a seleção.
// (Este `set` não mexe em componentes nem fios, por isso não grava nenhum passo no histórico.)
useCircuitStore.subscribe((state) => {
  const { selectedId, components } = state
  if (selectedId !== null && !components.some((c) => c.id === selectedId)) {
    useCircuitStore.setState({ selectedId: null })
  }
})
