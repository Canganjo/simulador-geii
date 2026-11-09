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
import { AccountMenu } from './AccountMenu'

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

/** Verdadeiro se o foco está num campo de texto (aí Ctrl+Z pertence ao campo, não ao circuito). */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  )
}

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

  // Ações do dossier (secção 6). Desfazer/Refazer já funcionam; as outras serão ligadas depois.
  const groups: Action[][] = [
    [
      { label: 'Novo', icon: FilePlus, disabled: true },
      { label: 'Abrir', icon: FolderOpen, disabled: true },
      { label: 'Guardar', icon: Save, disabled: true },
    ],
    [
      { label: 'Desfazer', icon: Undo2, shortcut: 'Ctrl+Z', onClick: undo, disabled: !canUndo },
      { label: 'Refazer', icon: Redo2, shortcut: 'Ctrl+Y', onClick: redo, disabled: !canRedo },
    ],
    [
      { label: 'Simular', icon: Play, disabled: true },
      { label: 'Parar', icon: Square, disabled: true },
      { label: 'Reset', icon: RotateCcw, disabled: true },
    ],
  ]

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-700 bg-slate-800 px-3">
      <span className="font-semibold tracking-tight text-slate-100">Simulador 2.5D GEII</span>

      <nav aria-label="Ações" className="flex items-center gap-1">
        {groups.map((group, i) => (
          <div
            key={i}
            className="flex items-center gap-1 border-l border-slate-700 pl-2 first:border-0"
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

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          title="Ajuda"
          className="rounded p-1.5 text-slate-300 hover:bg-slate-700"
        >
          <CircleHelp className="size-5" aria-hidden />
          <span className="sr-only">Ajuda</span>
        </button>
        <AccountMenu />
      </div>
    </header>
  )
}
