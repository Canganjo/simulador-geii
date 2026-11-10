import { Activity, PanelBottomClose, PanelBottomOpen } from 'lucide-react'
import { COLLAPSED_SIZE } from '../store/panelSizes'
import { useT } from './i18n'

interface Props {
  open: boolean
  onToggle: () => void
  /** Altura quando aberto, em px (puxa-se a borda de cima para mudar). */
  height: number
}

/** Painel de resultados (em baixo). Recolhido, fica só o cabeçalho com o botão para abrir. */
export function ResultsPanel({ open, onToggle, height }: Props) {
  const t = useT()
  const label = open ? t('results.collapse') : t('results.expand')

  return (
    <section
      aria-label={t('results.label')}
      style={{ height: open ? height : COLLAPSED_SIZE.results }}
      className="shrink-0 overflow-hidden border-t border-slate-700 bg-slate-800 transition-[height]"
    >
      <div className="flex h-9 items-center justify-between px-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Activity className="size-4" aria-hidden />
          {t('results.label')}
        </h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          title={label}
          className="rounded p-1 text-slate-300 hover:bg-slate-700"
        >
          {open ? <PanelBottomClose className="size-5" /> : <PanelBottomOpen className="size-5" />}
          <span className="sr-only">{label}</span>
        </button>
      </div>

      {open && (
        <p className="px-3 text-sm text-slate-400">
          {t('results.hintBefore')}{' '}
          <strong className="text-slate-200">{t('action.simulate')}</strong>{' '}
          {t('results.hintAfter')}
        </p>
      )}
    </section>
  )
}
