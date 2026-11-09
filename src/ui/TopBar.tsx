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

interface Action {
  label: string
  icon: LucideIcon
}

// Ações do dossier (secção 6). Ainda sem efeito: serão ligadas ao estado nas etapas seguintes.
const GROUPS: Action[][] = [
  [
    { label: 'Novo', icon: FilePlus },
    { label: 'Abrir', icon: FolderOpen },
    { label: 'Guardar', icon: Save },
  ],
  [
    { label: 'Desfazer', icon: Undo2 },
    { label: 'Refazer', icon: Redo2 },
  ],
  [
    { label: 'Simular', icon: Play },
    { label: 'Parar', icon: Square },
    { label: 'Reset', icon: RotateCcw },
  ],
]

export function TopBar() {
  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-slate-700 bg-slate-800 px-3">
      <span className="font-semibold tracking-tight text-slate-100">Simulador 2.5D GEII</span>

      <nav aria-label="Ações" className="flex items-center gap-1">
        {GROUPS.map((group, i) => (
          <div
            key={i}
            className="flex items-center gap-1 border-l border-slate-700 pl-2 first:border-0"
          >
            {group.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                title={label}
                disabled
                className="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-slate-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon className="size-4" aria-hidden />
                <span className="hidden lg:inline">{label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <button
        type="button"
        title="Ajuda"
        className="ml-auto rounded p-1.5 text-slate-300 hover:bg-slate-700"
      >
        <CircleHelp className="size-5" aria-hidden />
        <span className="sr-only">Ajuda</span>
      </button>
    </header>
  )
}
