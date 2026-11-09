import { PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { useState } from 'react'
import type { ComponentKind } from '../core/model'
import { IecSymbol } from './IecSymbol'

interface MenuItem {
  kind: ComponentKind
  label: string
}

// Lista provisória do MVP. Na etapa E4 passa a vir do catálogo em src/core/library.
const CATEGORIES: { name: string; items: MenuItem[] }[] = [
  {
    name: 'Fontes',
    items: [
      { kind: 'dc-source', label: 'Fonte DC' },
      { kind: 'ground', label: 'GND' },
    ],
  },
  { name: 'Passivos', items: [{ kind: 'resistor', label: 'Resistência' }] },
  { name: 'Comando', items: [{ kind: 'switch', label: 'Interruptor' }] },
  { name: 'Semicondutores', items: [{ kind: 'led', label: 'LED' }] },
  { name: 'Cargas', items: [{ kind: 'lamp', label: 'Lâmpada' }] },
]

interface Props {
  open: boolean
  onToggle: () => void
}

export function ComponentMenu({ open, onToggle }: Props) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const visible = CATEGORIES.map((c) => ({
    ...c,
    items: c.items.filter((i) => i.label.toLowerCase().includes(q)),
  })).filter((c) => c.items.length > 0)

  return (
    <aside
      aria-label="Menu de componentes"
      className={`flex shrink-0 flex-col border-r border-slate-700 bg-slate-800 transition-[width] ${
        open ? 'w-60' : 'w-12'
      }`}
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
                      {/* Arrastar para a zona livre chega na etapa E2. */}
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 rounded px-2 py-1.5 text-left text-sm text-slate-200 hover:bg-slate-700"
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
