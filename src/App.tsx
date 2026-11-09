import { useState } from 'react'
import { Workspace } from './scene/Workspace'
import { ComponentMenu } from './ui/ComponentMenu'
import { PropertiesPanel } from './ui/PropertiesPanel'
import { ResultsPanel } from './ui/ResultsPanel'
import { TopBar } from './ui/TopBar'

/**
 * Layout principal (etapa E1):
 *
 *   ┌──────────────── barra superior ────────────────┐
 *   │ menu │        zona livre (cena 2.5D)   │ props │
 *   │      ├─────────── resultados ──────────┤       │
 *   └──────┴─────────────────────────────────┴───────┘
 */
export default function App() {
  const [menuOpen, setMenuOpen] = useState(true)

  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <ComponentMenu open={menuOpen} onToggle={() => setMenuOpen((o) => !o)} />
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1" data-testid="workspace">
            <Workspace />
          </div>
          <ResultsPanel />
        </main>
        <PropertiesPanel />
      </div>
    </div>
  )
}
