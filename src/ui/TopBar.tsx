import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  Activity,
  CircleHelp,
  FilePlus,
  FolderOpen,
  SaveAll,
  Hash,
  Play,
  Redo2,
  RotateCcw,
  Save,
  Square,
  Undo2,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from 'zustand'
import type { ProjectFileError } from '../persistence/projectFile'
import { hasUnsavedChanges, useCircuitStore } from '../store/circuitStore'
import { useFileStore } from '../store/fileStore'
import { useSimulationStore } from '../store/simulationStore'
import { useUiStore } from '../store/uiStore'
import { AccountMenu } from './AccountMenu'
import { useT, type Translate } from './i18n'
import { isTyping } from './keyboard'
import { TransientDialog } from './TransientDialog'
import {
  canChooseFolder,
  confirmDiscard,
  forgetCurrentFile,
  openProjectFile,
  openWithPicker,
  saveProject,
  saveProjectAs,
} from './projectActions'

interface Action {
  label: string
  icon: LucideIcon
  /** Atalho mostrado na dica (title). */
  shortcut?: string
  onClick?: () => void
  disabled: boolean
  /** Botão que liga/desliga (aria-pressed): está ligado? */
  pressed?: boolean
  /** Dica (title) diferente do nome. */
  hint?: string
  /** Bolinha âmbar no ícone (ex.: Guardar com alterações por guardar). */
  badge?: boolean
  /** Botão menos usado: só o ícone até ecrãs muito largos (ver `labelClass`). */
  compact?: boolean
  /** Cor do ícone (cada grupo tem a sua, para a barra não parecer "apagada"). */
  tone: Tone
  /** Botão principal (Simular): fundo cheio, para se ver logo. */
  primary?: boolean
}

type Tone = 'sky' | 'amber' | 'emerald' | 'violet' | 'cyan' | 'red' | 'orange' | 'fuchsia'

/**
 * Cores vivas de cada ícone e do fundo ao passar o rato (classes escritas por extenso, para o
 * Tailwind as encontrar). Os botões desativados ficam esbatidos, mas com a mesma cor.
 */
const TONES: Readonly<Record<Tone, { icon: string; hover: string; pressed: string }>> = {
  sky: { icon: 'text-sky-400', hover: 'hover:bg-sky-500/15', pressed: 'bg-sky-500/20' },
  amber: { icon: 'text-amber-400', hover: 'hover:bg-amber-500/15', pressed: 'bg-amber-500/20' },
  emerald: {
    icon: 'text-emerald-400',
    hover: 'hover:bg-emerald-500/15',
    pressed: 'bg-emerald-500/20',
  },
  violet: { icon: 'text-violet-400', hover: 'hover:bg-violet-500/15', pressed: 'bg-violet-500/20' },
  cyan: { icon: 'text-cyan-400', hover: 'hover:bg-cyan-500/15', pressed: 'bg-cyan-500/25' },
  red: { icon: 'text-red-400', hover: 'hover:bg-red-500/15', pressed: 'bg-red-500/20' },
  orange: { icon: 'text-orange-400', hover: 'hover:bg-orange-500/15', pressed: 'bg-orange-500/20' },
  fuchsia: {
    icon: 'text-fuchsia-400',
    hover: 'hover:bg-fuchsia-500/15',
    pressed: 'bg-fuchsia-500/25',
  },
}

/**
 * A partir de que largura de ecrã o botão mostra o nome ao lado do ícone. Abaixo disso fica só o
 * ícone, e o nome continua na dica (title) e no aria-label.
 *
 * A barra de ações desliza para o lado quando não cabe, mas a barra de deslocamento está
 * escondida: um botão cortado ficava fora de vista sem sinal nenhum (issue #104). Os limites
 * foram medidos nas três línguas (o francês é o mais comprido), com folga para outras fontes:
 * - Simular (principal): nome a partir de 1024 px;
 * - Novo, Abrir, Guardar, Transitório: a partir de 1280 px;
 * - os outros (compact): só a partir de 1860 px (em francês precisam de ~1790 px).
 * O teste tests/e2e/barra.spec.ts confirma que a barra cabe em várias larguras.
 * O nome do ficheiro aberto, à esquerda, só aparece a partir de 1440 px (em francês, a 1280 px,
 * não cabia tudo); abaixo disso está na dica do Guardar.
 */
function labelClass(primary: boolean | undefined, compact: boolean | undefined): string {
  if (primary) return 'hidden lg:inline'
  if (compact) return 'hidden min-[1860px]:inline'
  return 'hidden xl:inline'
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

/**
 * Ctrl+S guarda, Ctrl+Shift+S guarda como e Ctrl+O abre
 * (em vez de "guardar a página" / "abrir ficheiro" do browser).
 */
function useFileShortcuts(onSave: () => void, onSaveAs: () => void, onOpen: () => void) {
  const handlers = useRef({ onSave, onSaveAs, onOpen })
  useEffect(() => {
    handlers.current = { onSave, onSaveAs, onOpen }
  })
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return
      const key = event.key.toLowerCase()
      if (key !== 's' && key !== 'o') return
      if (key === 'o' && event.shiftKey) return
      event.preventDefault()
      // Um valor a meio de ser escrito num campo é aplicado antes (o campo aplica ao sair).
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      if (key === 's' && event.shiftKey) handlers.current.onSaveAs()
      else if (key === 's') handlers.current.onSave()
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
  const showNodes = useUiStore((s) => s.showNodes)
  const toggleNodes = useUiStore((s) => s.toggleNodes)
  const showCurrent = useUiStore((s) => s.showCurrent)
  const toggleCurrent = useUiStore((s) => s.toggleCurrent)
  const { run, clear } = useSimulationStore.getState()
  const unsaved = useCircuitStore(hasUnsavedChanges)
  const fileName = useFileStore((s) => s.fileName)
  const notice = useFileStore((s) => s.notice)
  // O aviso "Guardado em …" some sozinho ao fim de uns segundos.
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => useFileStore.getState().clearNotice(), 3500)
    return () => clearTimeout(timer)
  }, [notice])
  // Dicas que explicam a diferença entre Guardar e Guardar como.
  const pickFolder = canChooseFolder()
  const saveHint = !pickFolder
    ? t('file.downloadHint')
    : fileName
      ? t('file.saveHint', { file: fileName })
      : t('file.saveHintNew')
  const saveAsHint = pickFolder ? t('file.saveAsHint') : t('file.downloadHint')
  const noticeText = notice
    ? t(
        notice.kind === 'saved'
          ? 'file.saved'
          : notice.kind === 'saved-as'
            ? 'file.savedAs'
            : 'file.downloaded',
        { file: notice.file },
      )
    : null
  // O <input type="file"> escondido (guardado em estado, para o botão Abrir clicar nele).
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [transientOpen, setTransientOpen] = useState(false)

  const onNew = () => {
    if (!confirmDiscard(t('file.confirmDiscard'))) return
    useCircuitStore.getState().newProject()
    forgetCurrentFile()
    setFileError(null)
  }
  const onOpen = async () => {
    if (!confirmDiscard(t('file.confirmDiscard'))) return
    // Chrome/Edge: janela do sistema (lembra-se do ficheiro). Outros: o <input type="file">.
    const result = await openWithPicker()
    if (result.status === 'unsupported') fileInput?.click()
    else if (result.status === 'error')
      setFileError(fileErrorText(result.error, result.fileName, t))
    else if (result.status === 'opened') setFileError(null)
  }
  const onSave = async () => {
    setFileError(null)
    await saveProject()
  }
  const onSaveAs = async () => {
    setFileError(null)
    await saveProjectAs()
  }
  const onFileChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // para se poder voltar a escolher o mesmo ficheiro
    if (!file) return
    const error = await openProjectFile(file)
    setFileError(error ? fileErrorText(error, file.name, t) : null)
  }
  useFileShortcuts(
    () => void onSave(),
    () => void onSaveAs(),
    () => void onOpen(),
  )

  // Ações do dossier (secção 6).
  // Parar e RAZ limpam os resultados. Transitório abre a janela com a duração e o passo (E10).
  const groups: Action[][] = [
    [
      { label: t('action.new'), icon: FilePlus, onClick: onNew, disabled: false, tone: 'sky' },
      {
        label: t('action.open'),
        icon: FolderOpen,
        shortcut: 'Ctrl+O',
        onClick: () => void onOpen(),
        disabled: false,
        tone: 'amber',
      },
      {
        label: t('action.save'),
        icon: Save,
        shortcut: 'Ctrl+S',
        onClick: () => void onSave(),
        disabled: false,
        badge: unsaved,
        tone: 'sky',
        hint: `${t('action.save')}: ${saveHint}`,
      },
      {
        label: t('action.saveAs'),
        icon: SaveAll,
        shortcut: 'Ctrl+Shift+S',
        onClick: () => void onSaveAs(),
        disabled: false,
        hint: `${t('action.saveAs')}: ${saveAsHint}`,
        compact: true,
        tone: 'sky',
      },
    ],
    [
      {
        label: t('action.undo'),
        icon: Undo2,
        shortcut: 'Ctrl+Z',
        onClick: undo,
        disabled: !canUndo,
        compact: true,
        tone: 'violet',
      },
      {
        label: t('action.redo'),
        icon: Redo2,
        shortcut: 'Ctrl+Y',
        onClick: redo,
        disabled: !canRedo,
        compact: true,
        tone: 'violet',
      },
    ],
    [
      {
        label: t('action.simulate'),
        icon: Play,
        onClick: run,
        disabled: !hasComponents,
        tone: 'emerald',
        primary: true,
      },
      {
        label: t('action.transient'),
        icon: Activity,
        onClick: () => setTransientOpen((open) => !open),
        disabled: !hasComponents,
        pressed: transientOpen,
        hint: t('transient.title'),
        tone: 'cyan',
      },
      {
        label: t('action.stop'),
        icon: Square,
        onClick: clear,
        disabled: !hasResult,
        compact: true,
        tone: 'red',
      },
      {
        label: t('action.reset'),
        icon: RotateCcw,
        onClick: clear,
        disabled: !hasResult,
        compact: true,
        tone: 'orange',
      },
    ],
    [
      {
        label: t('action.nodes'),
        hint: t('action.nodesHint'),
        icon: Hash,
        onClick: toggleNodes,
        disabled: false,
        pressed: showNodes,
        compact: true,
        tone: 'fuchsia',
      },
      {
        label: t('action.current'),
        hint: t('action.currentHint'),
        icon: Zap,
        onClick: toggleCurrent,
        disabled: false,
        pressed: showCurrent,
        compact: true,
        tone: 'amber',
      },
    ],
  ]

  return (
    <header className="relative flex h-14 shrink-0 items-center gap-2 border-b border-slate-700 bg-slate-800 px-2 md:gap-4 md:px-3">
      {/* No telemóvel só "GEII": o resto do espaço é para os botões. */}
      <span className="shrink-0 font-semibold tracking-tight text-slate-100">
        <span className="hidden md:inline">{t('app.title')} </span>GEII
      </span>

      {/* O ficheiro aberto: é onde "Guardar" grava (o "Guardar como…" pergunta sempre). */}
      <span
        data-testid="current-file"
        title={fileName ? t('file.current', { file: fileName }) : t('file.none')}
        className={`hidden max-w-44 shrink-0 truncate rounded px-1.5 py-0.5 text-xs min-[1440px]:inline ${
          fileName ? 'bg-slate-700/60 text-slate-300' : 'text-slate-500 italic'
        }`}
      >
        {fileName ?? t('file.none')}
        {unsaved && fileName ? ' •' : ''}
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
            {group.map(
              ({
                label,
                icon: Icon,
                shortcut,
                onClick,
                disabled,
                badge,
                pressed,
                hint,
                compact,
                tone,
                primary,
              }) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  aria-pressed={pressed}
                  title={shortcut ? `${hint ?? label} (${shortcut})` : (hint ?? label)}
                  disabled={disabled}
                  onClick={onClick}
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    primary
                      ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/30 enabled:hover:bg-emerald-400'
                      : `text-slate-100 ${TONES[tone].hover} ${pressed ? TONES[tone].pressed : ''}`
                  }`}
                >
                  <span className="relative">
                    <Icon
                      className={`size-4 ${primary ? 'fill-current' : TONES[tone].icon}`}
                      strokeWidth={2.25}
                      aria-hidden
                    />
                    {badge && (
                      <span
                        data-testid="unsaved-badge"
                        title={t('file.unsaved')}
                        className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-400"
                      />
                    )}
                  </span>
                  <span className={labelClass(primary, compact)}>{label}</span>
                </button>
              ),
            )}
          </div>
        ))}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-2">
        <button
          type="button"
          title={t('topbar.help')}
          className="rounded-md p-1.5 text-sky-400 hover:bg-sky-500/15"
        >
          <CircleHelp className="size-5" strokeWidth={2.25} aria-hidden />
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

      {transientOpen && <TransientDialog onClose={() => setTransientOpen(false)} />}

      {noticeText && !fileError && (
        <div
          key={notice?.id}
          role="status"
          data-testid="save-notice"
          className="absolute top-full left-1/2 z-40 mt-2 -translate-x-1/2 rounded border border-emerald-500/50 bg-slate-900 px-3 py-1.5 text-sm text-emerald-200 shadow-xl shadow-black/40"
        >
          {noticeText}
        </div>
      )}

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
