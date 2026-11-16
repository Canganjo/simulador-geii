import {
  Cable,
  Copy,
  PanelRightClose,
  PanelRightOpen,
  RotateCw,
  SlidersHorizontal,
  Spline,
  Trash2,
} from 'lucide-react'
import { CATALOG, type ParamSpec } from '../core/library'
import type { Component } from '../core/model'
import { useCircuitStore } from '../store/circuitStore'
import { COLLAPSED_SIZE } from '../store/panelSizes'
import { decimalSeparator, useT } from './i18n'
import { useLanguageStore } from '../store/languageStore'
import { useSimulationStore } from '../store/simulationStore'
import { formatSi } from './formatSi'
import { IecSymbol } from './IecSymbol'
import { BooleanParamField, ChoiceParamField, NameField, NumberParamField } from './ParamFields'
import { SourceStepper } from './SourceStepper'

interface Props {
  open: boolean
  onToggle: () => void
  /** Largura quando aberto, em px (puxa-se a borda da esquerda para mudar). */
  width: number
}

/** Painel de propriedades (direita). Recolhe para uma faixa estreita, como o menu da esquerda. */
export function PropertiesPanel({ open, onToggle, width }: Props) {
  const t = useT()
  const label = open ? t('props.collapse') : t('props.expand')
  const selected = useCircuitStore((s) => s.components.find((c) => c.id === s.selectedId) ?? null)
  const count = useCircuitStore((s) => s.selectedIds.length)
  const wireSelected = useCircuitStore((s) => s.selectedWireId !== null)

  return (
    <aside
      aria-label={t('props.label')}
      style={{ width: open ? width : COLLAPSED_SIZE.properties }}
      className="flex shrink-0 flex-col overflow-hidden border-l border-slate-700 bg-slate-800 transition-[width]"
    >
      <div className="flex h-10 items-center justify-between px-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          title={label}
          className="rounded p-1.5 text-slate-300 hover:bg-slate-700"
        >
          {open ? <PanelRightClose className="size-5" /> : <PanelRightOpen className="size-5" />}
          <span className="sr-only">{label}</span>
        </button>
        {open && (
          <h2 className="flex items-center gap-2 px-1 text-sm font-semibold text-slate-200">
            <SlidersHorizontal className="size-4" aria-hidden />
            {t('props.label')}
          </h2>
        )}
      </div>

      {open &&
        (count > 1 ? (
          <MultiSelection />
        ) : selected ? (
          <SelectedComponent component={selected} />
        ) : wireSelected ? (
          <SelectedWire />
        ) : (
          <p className="px-3 text-sm text-slate-400">{t('props.empty')}</p>
        ))}
    </aside>
  )
}

/** Vários componentes selecionados: os nomes e um botão para os apagar todos de uma vez. */
function MultiSelection() {
  const t = useT()
  const components = useCircuitStore((s) => s.components)
  const selectedIds = useCircuitStore((s) => s.selectedIds)
  const names = components.filter((c) => selectedIds.includes(c.id)).map((c) => c.name)
  const count = names.length

  return (
    <div
      className="flex flex-col gap-3 overflow-y-auto px-3 pb-3 text-sm"
      data-testid="multi-selection"
    >
      <h3 className="text-base font-semibold text-slate-100">{t('props.multiTitle', { count })}</h3>
      <p className="flex flex-wrap gap-1">
        {names.map((name) => (
          <span key={name} className="rounded bg-sky-500/20 px-1.5 py-0.5 text-sky-200">
            {name}
          </span>
        ))}
      </p>
      <p className="text-slate-400">{t('props.multiHint')}</p>
      <button
        type="button"
        onClick={() => useCircuitStore.getState().removeSelected()}
        title={`${t('props.deleteAll', { count })} (Delete)`}
        className="flex items-center gap-1.5 self-start rounded border border-red-500/60 px-2 py-1 text-red-200 hover:bg-red-500/20"
      >
        <Trash2 className="size-4" aria-hidden />
        {t('props.deleteAll', { count })}
      </button>
    </div>
  )
}

/** Um fio selecionado: como o organizar, endireitar ou apagar. */
function SelectedWire() {
  const t = useT()
  const wire = useCircuitStore((s) => s.wires.find((w) => w.id === s.selectedWireId) ?? null)
  if (!wire) return null
  const bent = (wire.waypoints?.length ?? 0) > 0
  const { setWireWaypoints, removeWire } = useCircuitStore.getState()

  return (
    <div
      className="flex flex-col gap-3 overflow-y-auto px-3 pb-3 text-sm"
      data-testid="wire-selection"
    >
      <h3 className="flex items-center gap-2 text-base font-semibold text-slate-100">
        <Cable className="size-4" aria-hidden />
        {t('props.wireTitle')}
      </h3>
      <p className="text-slate-400">{t('props.wireHint')}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setWireWaypoints(wire.id, [])}
          disabled={!bent}
          title={t('props.straighten')}
          className="flex items-center gap-1.5 rounded border border-slate-600 px-2 py-1 text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Spline className="size-4" aria-hidden />
          {t('props.straighten')}
        </button>
        <button
          type="button"
          onClick={() => removeWire(wire.id)}
          title={`${t('props.deleteWire')} (Delete)`}
          className="flex items-center gap-1.5 rounded border border-red-500/60 px-2 py-1 text-red-200 hover:bg-red-500/20"
        >
          <Trash2 className="size-4" aria-hidden />
          {t('props.deleteWire')}
        </button>
      </div>
    </div>
  )
}

function SelectedComponent({ component }: { component: Component }) {
  const t = useT()
  const { rotateComponent, duplicateComponent, removeComponent } = useCircuitStore.getState()
  const definition = CATALOG[component.kind]
  const specs: Readonly<Record<string, ParamSpec>> = definition.params
  const params: Readonly<Record<string, unknown>> = component.params

  const actions = [
    {
      label: t('props.rotate'),
      shortcut: 'R',
      icon: RotateCw,
      run: () => rotateComponent(component.id),
    },
    {
      label: t('props.duplicate'),
      shortcut: 'Ctrl+D',
      icon: Copy,
      run: () => duplicateComponent(component.id),
    },
    {
      label: t('props.delete'),
      shortcut: 'Delete',
      icon: Trash2,
      run: () => removeComponent(component.id),
    },
  ]

  return (
    <div className="flex flex-col gap-3 overflow-y-auto px-3 pb-3 text-sm">
      <div className="flex items-center gap-3">
        <IecSymbol kind={component.kind} className="h-6 w-10 shrink-0 text-amber-300" />
        <div>
          <h3 className="text-base font-semibold text-slate-100" data-testid="selected-name">
            {component.name}
          </h3>
          <p className="text-slate-400">{t(`kind.${component.kind}`)}</p>
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-slate-300">
        <dt className="text-slate-400">{t('props.position')}</dt>
        <dd data-testid="selected-position">
          ({component.position.x}, {component.position.y})
        </dd>
        <dt className="text-slate-400">{t('props.rotation')}</dt>
        <dd data-testid="selected-rotation">{component.rotation}°</dd>
      </dl>

      {/* Campos editáveis. A `key` inclui o valor guardado: se ele mudar por fora (Ctrl+Z),
          o campo recomeça com o valor novo em vez de ficar com o rascunho antigo. Os campos
          numéricos acompanham o valor sozinhos (para os botões − / + não serem recriados a meio
          de um clique). */}
      <div className="flex flex-col gap-2" data-testid="param-fields">
        <NameField key={`${component.id}:name:${component.name}`} component={component} />
        {Object.entries(specs).map(([param, spec]) => {
          const key = `${component.id}:${param}:${String(params[param])}`
          if (spec.type === 'number') {
            const stepper =
              component.kind === 'dc-source' && param === 'voltage' ? (
                <SourceStepper componentId={component.id} variant="panel" />
              ) : undefined
            return (
              <NumberParamField
                key={`${component.id}:${param}`}
                component={component}
                param={param}
                spec={spec}
                after={stepper}
              />
            )
          }
          if (spec.type === 'boolean') {
            return <BooleanParamField key={key} component={component} param={param} spec={spec} />
          }
          return <ChoiceParamField key={key} component={component} param={param} spec={spec} />
        })}
      </div>

      {component.kind === 'dc-source' && <SourceInfo component={component} />}

      <div className="flex flex-wrap gap-1">
        {actions.map(({ label, shortcut, icon: Icon, run }) => (
          <button
            key={label}
            type="button"
            onClick={run}
            title={`${label} (${shortcut})`}
            className="flex items-center gap-1.5 rounded border border-slate-600 px-2 py-1 text-slate-200 hover:bg-slate-700"
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Informação derivada da fonte (não é um parâmetro): potência máxima U × Imax e, depois de
 * Simular, o modo em que está (CV = tensão constante, CC = no limite de corrente).
 */
function SourceInfo({ component }: { component: Extract<Component, { kind: 'dc-source' }> }) {
  const t = useT()
  const decimal = decimalSeparator(useLanguageStore((s) => s.language))
  const mode = useSimulationStore((s) =>
    s.result?.ok ? s.result.results.get(component.id)?.sourceMode : undefined,
  )
  const { voltage, currentLimit } = component.params
  return (
    <div className="flex flex-col gap-1 rounded border border-slate-700 bg-slate-900/50 px-2 py-1.5 text-xs text-slate-400">
      {currentLimit !== undefined && (
        <p data-testid="source-max-power">
          {t('source.maxPower', { power: formatSi(voltage * currentLimit, 'W', 3, decimal) })}
        </p>
      )}
      <p className="flex items-center gap-2">
        {mode && (
          <span
            data-testid="source-mode"
            data-mode={mode}
            title={mode === 'cc' ? t('results.sourceCcTitle') : t('results.sourceCvTitle')}
            className={`rounded px-1.5 py-0.5 font-semibold ${
              mode === 'cc'
                ? 'bg-amber-400/20 text-amber-300'
                : 'bg-emerald-400/20 text-emerald-300'
            }`}
          >
            {mode === 'cc' ? t('results.sourceCc') : t('results.sourceCv')}
          </span>
        )}
        {t('source.modeHint')}
      </p>
    </div>
  )
}
