import { PanelRightClose, PanelRightOpen, SlidersHorizontal } from 'lucide-react'

interface Props {
  open: boolean
  onToggle: () => void
}

/** Painel de propriedades (direita). Recolhe para uma faixa estreita, como o menu da esquerda. */
export function PropertiesPanel({ open, onToggle }: Props) {
  const label = open ? 'Recolher propriedades' : 'Abrir propriedades'

  return (
    <aside
      aria-label="Propriedades"
      className={`flex shrink-0 flex-col border-l border-slate-700 bg-slate-800 transition-[width] ${
        open ? 'w-64' : 'w-12'
      }`}
    >
      <div className="flex h-10 items-center justify-between px-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          title={label}
          className="rounded p-1.5 text-slate-300 hover:bg-slate-700"
        >
          {open ? <PanelRightClose className="size-5" /> : <PanelRightOpen className="size-5" />}
          <span className="sr-only">{label}</span>
        </button>
        {open && (
          <h2 className="flex items-center gap-2 px-1 text-sm font-semibold text-slate-200">
            <SlidersHorizontal className="size-4" aria-hidden />
            Propriedades
          </h2>
        )}
      </div>

      {open && (
        <p className="px-3 text-sm text-slate-400">
          Seleciona um componente para ver e editar o nome, o valor, a unidade e a rotação.
        </p>
      )}
    </aside>
  )
}
