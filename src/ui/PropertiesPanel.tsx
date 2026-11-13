import {
  Copy,
  PanelRightClose,
  PanelRightOpen,
  RotateCw,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import { CATALOG, type ParamSpec } from '../core/library'
import type { Component } from '../core/model'
import { useCircuitStore } from '../store/circuitStore'
import { COLLAPSED_SIZE } from '../store/panelSizes'
import { useT } from './i18n'
import { IecSymbol } from './IecSymbol'
import { BooleanParamField, ChoiceParamField, NameField, NumberParamField } from './ParamFields'

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
        (selected ? (
          <SelectedComponent component={selected} />
        ) : (
          <p className="px-3 text-sm text-slate-400">{t('props.empty')}</p>
        ))}
    </aside>
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
          o campo recomeça com o valor novo em vez de ficar com o rascunho antigo. */}
      <div className="flex flex-col gap-2" data-testid="param-fields">
        <NameField key={`${component.id}:name:${component.name}`} component={component} />
        {Object.entries(specs).map(([param, spec]) => {
          const key = `${component.id}:${param}:${String(params[param])}`
          if (spec.type === 'number') {
            return <NumberParamField key={key} component={component} param={param} spec={spec} />
          }
          if (spec.type === 'boolean') {
            return <BooleanParamField key={key} component={component} param={param} spec={spec} />
          }
          return <ChoiceParamField key={key} component={component} param={param} spec={spec} />
        })}
      </div>

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
