import { useEffect, useRef, useState, type ChangeEvent } from 'react'
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
  X,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from 'zustand'
import type { ProjectFileError } from '../persistence/projectFile'
import { hasUnsavedChanges, useCircuitStore } from '../store/circuitStore'
import { useSimulationStore } from '../store/simulationStore'
import { AccountMenu } from './AccountMenu'
import { useT, type Translate } from './i18n'
import { isTyping } from './keyboard'
import { confirmDiscard, openProjectFile, saveProject } from './projectActions'

interface Action {
  label: string
  icon: LucideIcon
  /** Atalho mostrado na dica (title). */
  shortcut?: string
  onClick?: () => void
  disabled: boolean
  /** Bolinha âmbar no ícone (ex.: Guardar com alterações por guardar). */
  badge?: boolean
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

/** Ctrl+S guarda e Ctrl+O abre (em vez de "guardar a página" / "abrir ficheiro" do browser). */
function useFileShortcuts(onSave: () => void, onOpen: () => void) {
  const handlers = useRef({ onSave, onOpen })
  useEffect(() => {
    handlers.current = { onSave, onOpen }
  })
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return
      const key = event.key.toLowerCase()
      if (key !== 's' && key !== 'o') return
      event.preventDefault()
      // Um valor a meio de ser escrito num campo é aplicado antes (o campo aplica ao sair).
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      if (key === 's') handlers.current.onSave()
      else handlers.current.onOpen()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

/** Mensagem de um ficheiro recusado, na língua escolhida. */
function fileErrorText(error: ProjectFileError, file: string, t: Translate): string {
  if (error.code === 'not-json') return t('file.errorNotJson', { file })
  if (error.code === 'newer-version') return t('file.errorNewer', { file, version: error.version })
  return t('file.errorInvalid', { file, detail: error.detail })
}

export function TopBar() {
  const canUndo = useStore(useCircuitStore.temporal, (s) => s.pastStates.length > 0)
  const canRedo = useStore(useCircuitStore.temporal, (s) => s.futureStates.length > 0)
  useUndoShortcuts()
  const t = useT()
  const hasComponents = useCircuitStore((s) => s.components.length > 0)
  const hasResult = useSimulationStore((s) => s.result !== null)
  const { run, clear } = useSimulationStore.getState()
  const unsaved = useCircuitStore(hasUnsavedChanges)
  // O <input type="file"> escondido (guardado em estado, para o botão Abrir clicar nele).
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const onNew = () => {
    if (!confirmDiscard(t('file.confirmDiscard'))) return
    useCircuitStore.getState().newProject()
    setFileError(null)
  }
  const onOpen = () => {
    if (confirmDiscard(t('file.confirmDiscard'))) fileInput?.click()
  }
  const onSave = () => {
    saveProject()
    setFileError(null)
  }
  const onFileChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // para se poder voltar a escolher o mesmo ficheiro
    if (!file) return
    const error = await openProjectFile(file)
    setFileError(error ? fileErrorText(error, file.name, t) : null)
  }
  useFileShortcuts(onSave, onOpen)

  // Ações do dossier (secção 6).
  // Parar e RAZ limpam os resultados (no MVP só DC não há simulação a correr no tempo).
  const groups: Action[][] = [
    [
      { label: t('action.new'), icon: FilePlus, onClick: onNew, disabled: false },
      {
        label: t('action.open'),
        icon: FolderOpen,
        shortcut: 'Ctrl+O',
        onClick: onOpen,
        disabled: false,
      },
      {
        label: t('action.save'),
        icon: Save,
        shortcut: 'Ctrl+S',
        onClick: onSave,
        disabled: false,
        badge: unsaved,
      },
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
    <header className="relative flex h-14 shrink-0 items-center gap-2 border-b border-slate-700 bg-slate-800 px-2 md:gap-4 md:px-3">
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
            {group.map(({ label, icon: Icon, shortcut, onClick, disabled, badge }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                title={shortcut ? `${label} (${shortcut})` : label}
                disabled={disabled}
                onClick={onClick}
                className="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-slate-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="relative">
                  <Icon className="size-4" aria-hidden />
                  {badge && (
                    <span
                      data-testid="unsaved-badge"
                      title={t('file.unsaved')}
                      className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-400"
                    />
                  )}
                </span>
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

      {/* Abrir: o seletor de ficheiros do sistema (escondido; o botão Abrir clica nele). */}
      <input
        ref={setFileInput}
        type="file"
        accept=".json,application/json"
        className="hidden"
        data-testid="open-project-input"
        onChange={(e) => void onFileChosen(e)}
      />

      {fileError && (
        <div
          role="alert"
          className="absolute top-full left-1/2 z-40 mt-2 flex w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 items-start gap-2 rounded border border-red-500/60 bg-slate-900 px-3 py-2 text-sm text-red-200 shadow-xl shadow-black/40"
        >
          <span className="flex-1">{fileError}</span>
          <button
            type="button"
            onClick={() => setFileError(null)}
            aria-label={t('file.close')}
            className="rounded p-0.5 text-slate-300 hover:bg-slate-700"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </header>
  )
}
