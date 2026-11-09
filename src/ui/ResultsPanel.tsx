import { Activity } from 'lucide-react'

export function ResultsPanel() {
  return (
    <section
      aria-label="Resultados"
      className="h-40 shrink-0 border-t border-slate-700 bg-slate-800"
    >
      <h2 className="flex h-9 items-center gap-2 px-3 text-sm font-semibold text-slate-200">
        <Activity className="size-4" aria-hidden />
        Resultados
      </h2>
      <p className="px-3 text-sm text-slate-400">
        Carrega em <strong className="text-slate-200">Simular</strong> para ver a tensão (U), a
        corrente (I), a resistência (R) e a potência (P) de cada componente.
      </p>
    </section>
  )
}
