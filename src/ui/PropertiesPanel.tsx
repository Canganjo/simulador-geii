import { SlidersHorizontal } from 'lucide-react'

export function PropertiesPanel() {
  return (
    <aside
      aria-label="Propriedades"
      className="flex w-64 shrink-0 flex-col border-l border-slate-700 bg-slate-800"
    >
      <h2 className="flex h-10 items-center gap-2 px-3 text-sm font-semibold text-slate-200">
        <SlidersHorizontal className="size-4" aria-hidden />
        Propriedades
      </h2>
      <p className="px-3 text-sm text-slate-400">
        Seleciona um componente para ver e editar o nome, o valor, a unidade e a rotação.
      </p>
    </aside>
  )
}
