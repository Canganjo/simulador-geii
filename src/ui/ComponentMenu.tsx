import { PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { useState } from 'react'
import { catalogByCategory } from '../core/library'
import { COMPONENT_DRAG_TYPE, requestPlaceComponent } from '../scene/componentDrag'
import { COLLAPSED_SIZE } from '../store/panelSizes'
import { IecSymbol } from './IecSymbol'

// A lista vem do catálogo (src/core/library): um componente novo no catálogo aparece aqui sozinho.
const CATEGORIES = catalogByCategory().map(({ category, items }) => ({ name: category, items }))

interface Props {
  open: boolean
  onToggle: () => void
  /** Largura quando aberto, em px (puxa-se a borda da direita para mudar). */
  width: number
}

export function ComponentMenu({ open, onToggle, width }: Props) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const visible = CATEGORIES.map((c) => ({
    ...c,
    items: c.items.filter((i) => i.label.toLowerCase().includes(q)),
  })).filter((c) => c.items.length > 0)

  return (
    <aside
      aria-label="Menu de componentes"
      style={{ width: open ? width : COLLAPSED_SIZE.menu }}
      className="flex shrink-0 flex-col overflow-hidden border-r border-slate-700 bg-slate-800 transition-[width]"
    >
      <div className="flex h-10 items-center justify-between px-2">
        {open && <h2 className="px-1 text-sm font-semibold text-slate-200">Componentes</h2>}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          title={open ? 'Recolher menu' : 'Abrir menu'}
          className="rounded p-1.5 text-slate-300 hover:bg-slate-700"
        >
          {open ? <PanelLeftClose className="size-5" /> : <PanelLeftOpen className="size-5" />}
          <span className="sr-only">{open ? 'Recolher menu' : 'Abrir menu'}</span>
        </button>
      </div>

      {open && (
        <>
          <label className="mx-2 mb-2 flex items-center gap-2 rounded bg-slate-900 px-2 py-1.5 text-slate-400">
            <Search className="size-4" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar…"
              className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
          </label>

          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {visible.map((category) => (
              <section key={category.name} className="mb-3">
                <h3 className="px-1 pb-1 text-xs font-medium tracking-wide text-slate-400 uppercase">
                  {category.name}
                </h3>
                <ul>
                  {category.items.map((item) => (
                    <li key={item.kind}>
                      {/* Arrastar para a zona livre cria o componente onde se larga;
                          um clique cria-o no centro da vista. */}
                      <button
                        type="button"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(COMPONENT_DRAG_TYPE, item.kind)
                          e.dataTransfer.effectAllowed = 'copy'
                        }}
                        onClick={() => requestPlaceComponent(item.kind)}
                        title={`Arrasta para a zona livre (ou clica) para adicionar: ${item.label}`}
                        className="flex w-full cursor-grab items-center gap-3 rounded px-2 py-1.5 text-left text-sm text-slate-200 hover:bg-slate-700 active:cursor-grabbing"
                      >
                        <IecSymbol kind={item.kind} className="h-5 w-8 text-amber-300" />
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {visible.length === 0 && (
              <p className="px-1 text-sm text-slate-500">Nenhum componente encontrado.</p>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
