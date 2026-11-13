import { useEffect } from 'react'
import {
  CircleHelp,
  FilePlus,
  FolderOpen,
  Play,
  Redo2,
  RotateCcw,
  Save,
  Square,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from 'zustand'
import { useCircuitStore } from '../store/circuitStore'
import { useSimulationStore } from '../store/simulationStore'
import { AccountMenu } from './AccountMenu'
import { useT } from './i18n'
import { isTyping } from './keyboard'

interface Action {
  label: string
  icon: LucideIcon
  /** Atalho mostrado na dica (title). */
  shortcut?: string
  onClick?: () => void
  disabled: boolean
}

const undo = () => useCircuitStore.temporal.getState().undo()
const redo = () => useCircuitStore.temporal.getState().redo()

/** Atalhos: Ctrl+Z desfaz; Ctrl+Y e Ctrl+Shift+Z refazem (Cmd em vez de Ctrl no macOS). */
function useUndoShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || isTyping(event.target)) return
      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

export function TopBar() {
  const canUndo = useStore(useCircuitStore.temporal, (s) => s.pastStates.length > 0)
  const canRedo = useStore(useCircuitStore.temporal, (s) => s.futureStates.length > 0)
  useUndoShortcuts()
  const t = useT()
  const hasComponents = useCircuitStore((s) => s.components.length > 0)
  const hasResult = useSimulationStore((s) => s.result !== null)
  const { run, clear } = useSimulationStore.getState()

  // Ações do dossier (secção 6). Novo/Abrir/Guardar serão ligadas com a persistência (JSON).
  // Parar e RAZ limpam os resultados (no MVP só DC não há simulação a correr no tempo).
  const groups: Action[][] = [
    [
      { label: t('action.new'), icon: FilePlus, disabled: true },
      { label: t('action.open'), icon: FolderOpen, disabled: true },
      { label: t('action.save'), icon: Save, disabled: true },
    ],
    [
      {
        label: t('action.undo'),
        icon: Undo2,
        shortcut: 'Ctrl+Z',
        onClick: undo,
        disabled: !canUndo,
      },
      {
        label: t('action.redo'),
        icon: Redo2,
        shortcut: 'Ctrl+Y',
        onClick: redo,
        disabled: !canRedo,
      },
    ],
    [
      { label: t('action.simulate'), icon: Play, onClick: run, disabled: !hasComponents },
      { label: t('action.stop'), icon: Square, onClick: clear, disabled: !hasResult },
      { label: t('action.reset'), icon: RotateCcw, onClick: clear, disabled: !hasResult },
    ],
  ]

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-700 bg-slate-800 px-2 md:gap-4 md:px-3">
      {/* No telemóvel só "GEII": o resto do espaço é para os botões. */}
      <span className="shrink-0 font-semibold tracking-tight text-slate-100">
        <span className="hidden md:inline">{t('app.title')} </span>GEII
      </span>

      {/* Se não couber (telemóvel), a barra de ações desliza para o lado com o dedo. */}
      <nav
        aria-label={t('topbar.actions')}
        className="flex min-w-0 flex-1 [scrollbar-width:none] items-center gap-1 overflow-x-auto"
      >
        {groups.map((group, i) => (
          <div
            key={i}
            className="flex shrink-0 items-center gap-1 border-l border-slate-700 pl-2 first:border-0"
          >
            {group.map(({ label, icon: Icon, shortcut, onClick, disabled }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                title={shortcut ? `${label} (${shortcut})` : label}
                disabled={disabled}
                onClick={onClick}
                className="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-slate-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon className="size-4" aria-hidden />
                <span className="hidden lg:inline">{label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-2">
        <button
          type="button"
          title={t('topbar.help')}
          className="rounded p-1.5 text-slate-300 hover:bg-slate-700"
        >
          <CircleHelp className="size-5" aria-hidden />
          <span className="sr-only">{t('topbar.help')}</span>
        </button>
        <AccountMenu />
      </div>
    </header>
  )
}
