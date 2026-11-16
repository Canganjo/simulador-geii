import {
  Cpu,
  Lightbulb,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ToggleLeft,
  Waves,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useState, type DragEvent } from 'react'
import { catalogByCategory, type ComponentCategory } from '../core/library'
import type { ComponentKind } from '../core/model'
import { COMPONENT_DRAG_TYPE, requestPlaceComponent } from '../scene/componentDrag'
import { COLLAPSED_SIZE } from '../store/panelSizes'
import { useLanguageStore } from '../store/languageStore'
import { decimalSeparator, useT } from './i18n'
import { IecSymbol } from './IecSymbol'
import { CATEGORY_STYLE, defaultSummary } from './menuItems'

// A lista vem do catálogo (src/core/library): um componente novo no catálogo aparece aqui sozinho.
const CATEGORIES = catalogByCategory().map(({ category, items }) => ({ name: category, items }))

/** Ícone (lucide) do título de cada categoria. */
const CATEGORY_ICON: Readonly<Record<ComponentCategory, LucideIcon>> = {
  Fontes: Zap,
  Passivos: Waves,
  Comando: ToggleLeft,
  Semicondutores: Cpu,
  Cargas: Lightbulb,
}

interface Props {
  open: boolean
  onToggle: () => void
  /** Largura quando aberto, em px (puxa-se a borda da direita para mudar). */
  width: number
  /** Chamado depois de escolher um componente com um clique/toque (no telemóvel fecha a gaveta). */
  onPicked?: () => void
}

/** O quadrado arredondado com o símbolo IEC, na cor da categoria. */
function SymbolBadge({ kind, category }: { kind: ComponentKind; category: ComponentCategory }) {
  const style = CATEGORY_STYLE[category]
  return (
    <span
      className={`flex size-9 shrink-0 items-center justify-center rounded-lg border bg-gradient-to-br shadow-sm shadow-black/40 ${style.badge}`}
    >
      <IecSymbol kind={kind} strokeWidth={1.75} className={`h-4 w-7 ${style.symbol}`} />
    </span>
  )
}

interface ItemProps {
  kind: ComponentKind
  category: ComponentCategory
  /** 'tile' = mosaico com nome e valor (menu aberto); 'rail' = só o ícone (menu recolhido). */
  variant: 'tile' | 'rail'
  onPicked?: () => void
}

/**
 * Um componente do menu. Arrastar para a zona livre cria-o onde se larga; um clique cria-o no
 * centro da vista. O nome acessível é o nome do componente (os testes procuram-no assim).
 */
function MenuItem({ kind, category, variant, onPicked }: ItemProps) {
  const t = useT()
  const decimal = decimalSeparator(useLanguageStore((s) => s.language))
  const name = t(`kind.${kind}`)
  const summary = defaultSummary(kind, t, decimal)
  const common = {
    type: 'button' as const,
    draggable: true,
    'aria-label': name,
    'data-menu-item': kind,
    title: t('menu.itemHint', { name }),
    onDragStart: (e: DragEvent<HTMLButtonElement>) => {
      e.dataTransfer.setData(COMPONENT_DRAG_TYPE, kind)
      e.dataTransfer.effectAllowed = 'copy'
    },
    onClick: () => {
      requestPlaceComponent(kind)
      onPicked?.()
    },
  }

  if (variant === 'rail') {
    return (
      <button
        {...common}
        className="flex cursor-grab items-center justify-center rounded-lg p-0.5 transition hover:-translate-y-0.5 hover:brightness-125 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none active:cursor-grabbing"
      >
        <SymbolBadge kind={kind} category={category} />
      </button>
    )
  }

  return (
    <button
      {...common}
      className="group flex w-full cursor-grab items-center gap-3 rounded-lg border border-transparent px-2 py-2 text-left transition hover:-translate-y-0.5 hover:border-slate-600 hover:bg-slate-700/60 hover:shadow-md hover:shadow-black/30 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none active:translate-y-0 active:cursor-grabbing md:py-1.5"
    >
      <SymbolBadge kind={kind} category={category} />
      <span className="min-w-0">
        <span className="block truncate text-sm text-slate-100">{name}</span>
        {summary && (
          <span
            className="block truncate text-xs text-slate-400 group-hover:text-slate-300"
            data-menu-summary
          >
            {summary}
          </span>
        )}
      </span>
    </button>
  )
}

export function ComponentMenu({ open, onToggle, width, onPicked }: Props) {
  const t = useT()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const visible = CATEGORIES.map((c) => ({
    ...c,
    items: c.items.filter((i) => t(`kind.${i.kind}`).toLowerCase().includes(q)),
  })).filter((c) => c.items.length > 0)

  const toggleLabel = open ? t('menu.collapse') : t('menu.expand')

  return (
    <aside
      aria-label={t('menu.label')}
      style={{ width: open ? width : COLLAPSED_SIZE.menu }}
      className="flex shrink-0 flex-col overflow-hidden border-r border-slate-700 bg-slate-800 transition-[width]"
    >
      <div className="flex h-10 items-center justify-between px-2">
        {open && <h2 className="px-1 text-sm font-semibold text-slate-200">{t('menu.title')}</h2>}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          title={toggleLabel}
          className="rounded p-1.5 text-slate-300 hover:bg-slate-700"
        >
          {open ? <PanelLeftClose className="size-5" /> : <PanelLeftOpen className="size-5" />}
          <span className="sr-only">{toggleLabel}</span>
        </button>
      </div>

      {open ? (
        <>
          <label className="mx-2 mb-2 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-400 focus-within:border-sky-500">
            <Search className="size-4" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('menu.search')}
              className="w-full bg-transparent text-base text-slate-100 outline-none placeholder:text-slate-500 md:text-sm"
            />
          </label>

          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {visible.map((category) => {
              const Icon = CATEGORY_ICON[category.name]
              return (
                <section key={category.name} className="mb-3">
                  <h3 className="flex items-center gap-1.5 px-1 pb-1 text-xs font-medium tracking-wide text-slate-400 uppercase">
                    <Icon
                      className={`size-3.5 ${CATEGORY_STYLE[category.name].heading}`}
                      aria-hidden
                    />
                    {t(`category.${category.name}`)}
                  </h3>
                  <ul className="space-y-0.5">
                    {category.items.map((item) => (
                      <li key={item.kind}>
                        <MenuItem
                          kind={item.kind}
                          category={category.name}
                          variant="tile"
                          onPicked={onPicked}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
            {visible.length === 0 && (
              <p className="px-1 text-sm text-slate-500">{t('menu.empty')}</p>
            )}
          </div>
        </>
      ) : (
        // Menu recolhido: uma coluna só com os ícones (também se clicam e arrastam).
        <ul className="flex flex-1 flex-col items-center gap-1 overflow-y-auto pb-2" data-menu-rail>
          {CATEGORIES.map((category, index) => (
            <li key={category.name} className="contents">
              {index > 0 && <span className="my-1 h-px w-6 bg-slate-700" aria-hidden />}
              {category.items.map((item) => (
                <MenuItem
                  key={item.kind}
                  kind={item.kind}
                  category={category.name}
                  variant="rail"
                  onPicked={onPicked}
                />
              ))}
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
