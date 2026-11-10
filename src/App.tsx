import { useEffect, type ReactNode } from 'react'
import { Workspace } from './scene/Workspace'
import { COLLAPSED_SIZE } from './store/panelSizes'
import { useLanguageStore } from './store/languageStore'
import { useUiStore } from './store/uiStore'
import { ComponentMenu } from './ui/ComponentMenu'
import { PropertiesPanel } from './ui/PropertiesPanel'
import { ResizeHandle } from './ui/ResizeHandle'
import { ResultsPanel } from './ui/ResultsPanel'
import { TopBar } from './ui/TopBar'
import { useEditShortcuts } from './ui/keyboard'
import { useT } from './ui/i18n'
import { useIsMobile } from './ui/useIsMobile'

/** No telemóvel: altura máxima dos resultados e largura máxima das gavetas (fração do ecrã). */
const MOBILE_RESULTS_HEIGHT = 120
const MOBILE_DRAWER_FRACTION = 0.85

/**
 * Layout principal (etapa E1):
 *
 *   ┌──────────────── barra superior ────────────────┐
 *   │ menu │        zona livre (cena 2.5D)   │ props │
 *   │      ├─────────── resultados ──────────┤       │
 *   └──────┴─────────────────────────────────┴───────┘
 *
 * Computador: as bordas entre os painéis puxam-se com o rato (ResizeHandle), como no VS Code.
 * Telemóvel (< 768 px): o menu e as propriedades ficam recolhidos numa faixa estreita e, quando
 * se abrem, aparecem como GAVETAS por cima da cena (a cena não encolhe). Tocar no fundo
 * escurecido fecha-as.
 */
export default function App() {
  const ui = useUiStore()
  const mobile = useIsMobile()
  const t = useT()
  const language = useLanguageStore((s) => s.language)
  useEditShortcuts() // R, Ctrl+D, Delete, Escape no componente selecionado

  // <html lang="…"> segue a língua escolhida (leitores de ecrã, hifenização, tradutores).
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  // Ao entrar no modo telemóvel (abrir a app ou rodar o ecrã), as gavetas começam fechadas.
  useEffect(() => {
    if (mobile) useUiStore.setState({ menuOpen: false, propertiesOpen: false })
  }, [mobile])

  const drawerOpen = mobile && (ui.menuOpen || ui.propertiesOpen)
  const closeDrawers = () => useUiStore.setState({ menuOpen: false, propertiesOpen: false })
  const drawerWidth = (size: number) =>
    mobile ? Math.min(size, Math.round(window.innerWidth * MOBILE_DRAWER_FRACTION)) : size

  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      <TopBar />
      <div className="relative flex min-h-0 flex-1">
        <Drawer mobile={mobile} side="left" collapsed={COLLAPSED_SIZE.menu}>
          <ComponentMenu
            open={ui.menuOpen}
            onToggle={ui.toggleMenu}
            width={drawerWidth(ui.sizes.menu)}
            // No telemóvel a gaveta tapa a cena: fecha-se depois de escolher o componente.
            onPicked={mobile ? ui.toggleMenu : undefined}
          />
        </Drawer>
        {ui.menuOpen && !mobile && (
          <ResizeHandle panel="menu" label={t('resize.menu')} grows="right" />
        )}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1" data-testid="workspace">
            <Workspace />
          </div>
          {ui.resultsOpen && !mobile && (
            <ResizeHandle panel="results" label={t('resize.results')} grows="up" />
          )}
          <ResultsPanel
            open={ui.resultsOpen}
            onToggle={ui.toggleResults}
            height={mobile ? Math.min(ui.sizes.results, MOBILE_RESULTS_HEIGHT) : ui.sizes.results}
          />
        </main>
        {ui.propertiesOpen && !mobile && (
          <ResizeHandle panel="properties" label={t('resize.properties')} grows="left" />
        )}
        <Drawer mobile={mobile} side="right" collapsed={COLLAPSED_SIZE.properties}>
          <PropertiesPanel
            open={ui.propertiesOpen}
            onToggle={ui.toggleProperties}
            width={drawerWidth(ui.sizes.properties)}
          />
        </Drawer>

        {drawerOpen && (
          <button
            type="button"
            aria-label={t('drawer.close')}
            onClick={closeDrawers}
            className="absolute inset-0 z-20 bg-black/50"
          />
        )}
      </div>
    </div>
  )
}

/**
 * No computador não faz nada (o painel fica no fluxo normal). No telemóvel ocupa só a largura
 * da faixa recolhida; o painel, quando aberto, sai por cima da cena (position: absolute).
 */
function Drawer({
  mobile,
  side,
  collapsed,
  children,
}: {
  mobile: boolean
  side: 'left' | 'right'
  collapsed: number
  children: ReactNode
}) {
  if (!mobile) return children
  return (
    <div className="relative z-30 shrink-0" style={{ width: collapsed }}>
      <div
        className={`absolute inset-y-0 flex shadow-xl shadow-black/50 ${side === 'left' ? 'left-0' : 'right-0'}`}
      >
        {children}
      </div>
    </div>
  )
}
