import { Workspace } from './scene/Workspace'
import { useUiStore } from './store/uiStore'
import { ComponentMenu } from './ui/ComponentMenu'
import { PropertiesPanel } from './ui/PropertiesPanel'
import { ResizeHandle } from './ui/ResizeHandle'
import { ResultsPanel } from './ui/ResultsPanel'
import { TopBar } from './ui/TopBar'

/**
 * Layout principal (etapa E1):
 *
 *   ┌──────────────── barra superior ────────────────┐
 *   │ menu │        zona livre (cena 2.5D)   │ props │
 *   │      ├─────────── resultados ──────────┤       │
 *   └──────┴─────────────────────────────────┴───────┘
 *
 * As bordas entre os painéis puxam-se com o rato (ResizeHandle), como no VS Code.
 */
export default function App() {
  const ui = useUiStore()

  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <ComponentMenu open={ui.menuOpen} onToggle={ui.toggleMenu} width={ui.sizes.menu} />
        {ui.menuOpen && <ResizeHandle panel="menu" label="Redimensionar menu" grows="right" />}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1" data-testid="workspace">
            <Workspace />
          </div>
          {ui.resultsOpen && (
            <ResizeHandle panel="results" label="Redimensionar resultados" grows="up" />
          )}
          <ResultsPanel
            open={ui.resultsOpen}
            onToggle={ui.toggleResults}
            height={ui.sizes.results}
          />
        </main>
        {ui.propertiesOpen && (
          <ResizeHandle panel="properties" label="Redimensionar propriedades" grows="left" />
        )}
        <PropertiesPanel
          open={ui.propertiesOpen}
          onToggle={ui.toggleProperties}
          width={ui.sizes.properties}
        />
      </div>
    </div>
  )
}
