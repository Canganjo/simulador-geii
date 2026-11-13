import { useState, type KeyboardEvent, type ReactNode } from 'react'
import type { BooleanParamSpec, ChoiceParamSpec, NumberParamSpec, ParamSpec } from '../core/library'
import type { Component } from '../core/model'
import { useCircuitStore } from '../store/circuitStore'
import { useLanguageStore } from '../store/languageStore'
import { formatSi } from './formatSi'
import { decimalSeparator, isMessageKey, useT } from './i18n'
import { formatSiInput, paramLabel } from './paramText'
import { parseSi } from './parseSi'

/**
 * Campos editáveis do painel de propriedades: nome, números (com prefixos SI), sim/não e opções.
 *
 * Os campos de texto só aplicam o valor com Enter ou ao sair do campo (não a cada tecla), para
 * que um passo do desfazer seja "R1: 1 kΩ → 470 Ω" e não uma letra de cada vez. Esc anula.
 * Um valor recusado fica a vermelho com a explicação; o circuito não muda.
 */

const INPUT =
  'w-full min-w-0 rounded bg-slate-900 px-2 py-1 text-base text-slate-100 outline-none focus:ring-2 focus:ring-sky-500 md:text-sm'
const INPUT_ERROR = 'ring-2 ring-red-500 focus:ring-red-500'

/** Enter aplica (sai do campo), Esc volta ao valor guardado. */
function editKeys(reset: () => void) {
  return (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur()
    else if (e.key === 'Escape') {
      const input = e.currentTarget
      reset()
      // Sai do campo depois de o rascunho voltar ao valor guardado (o blur já não aplica nada).
      setTimeout(() => input.blur(), 0)
    }
  }
}

export function NameField({ component }: { component: Component }) {
  const t = useT()
  const [draft, setDraft] = useState(component.name)
  const [error, setError] = useState<string | null>(null)

  const apply = () => {
    if (draft === component.name) return setError(null)
    const problem = useCircuitStore.getState().renameComponent(component.id, draft)
    if (problem === 'empty') setError(t('props.nameEmpty'))
    else if (problem === 'taken') setError(t('props.nameTaken', { name: draft.trim() }))
    else {
      setError(null)
      setDraft(draft.trim())
    }
  }

  return (
    <Field label={t('props.name')} error={error}>
      <input
        value={draft}
        maxLength={20}
        aria-label={t('props.name')}
        aria-invalid={error !== null}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={apply}
        onKeyDown={editKeys(() => {
          setDraft(component.name)
          setError(null)
        })}
        className={`${INPUT} ${error ? INPUT_ERROR : ''}`}
      />
    </Field>
  )
}

interface ParamProps<S extends ParamSpec> {
  component: Component
  param: string
  spec: S
}

export function NumberParamField({ component, param, spec }: ParamProps<NumberParamSpec>) {
  const t = useT()
  const decimal = decimalSeparator(useLanguageStore((s) => s.language))
  const stored = (component.params as Readonly<Record<string, unknown>>)[param]
  const shown = typeof stored === 'number' ? formatSiInput(stored, decimal) : ''
  const [draft, setDraft] = useState(shown)
  const [error, setError] = useState<string | null>(null)
  const label = paramLabel(param, spec, t)

  const apply = () => {
    if (draft === shown) return setError(null)
    const value = parseSi(draft, spec.unit)
    if (value === null) return setError(t('props.invalidNumber'))
    const issues = useCircuitStore.getState().updateParams(component.id, { [param]: value })
    if (issues.length > 0) {
      setError(
        t('props.outOfRange', {
          min: formatSi(spec.min, spec.unit, 3, decimal),
          max: formatSi(spec.max, spec.unit, 3, decimal),
        }),
      )
    } else {
      setError(null)
      setDraft(formatSiInput(value, decimal))
    }
  }

  return (
    <Field label={label} error={error}>
      <div className="flex items-center gap-1.5">
        <input
          value={draft}
          inputMode="decimal"
          aria-label={label}
          aria-invalid={error !== null}
          data-param={param}
          title={t('props.numberHint')}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={apply}
          onKeyDown={editKeys(() => {
            setDraft(shown)
            setError(null)
          })}
          className={`${INPUT} ${error ? INPUT_ERROR : ''}`}
        />
        <span className="w-4 shrink-0 text-slate-400">{spec.unit}</span>
      </div>
    </Field>
  )
}

export function BooleanParamField({ component, param, spec }: ParamProps<BooleanParamSpec>) {
  const t = useT()
  const checked = (component.params as Readonly<Record<string, unknown>>)[param] === true
  return (
    <label className="flex cursor-pointer items-center gap-2 py-1 text-slate-300">
      <input
        type="checkbox"
        checked={checked}
        data-param={param}
        onChange={(e) =>
          useCircuitStore.getState().updateParams(component.id, { [param]: e.target.checked })
        }
        className="size-4 accent-sky-500"
      />
      {paramLabel(param, spec, t)}
    </label>
  )
}

export function ChoiceParamField({ component, param, spec }: ParamProps<ChoiceParamSpec>) {
  const t = useT()
  const value = (component.params as Readonly<Record<string, unknown>>)[param]
  const label = paramLabel(param, spec, t)
  return (
    <Field label={label} error={null}>
      <select
        value={typeof value === 'string' ? value : ''}
        aria-label={label}
        data-param={param}
        onChange={(e) =>
          useCircuitStore.getState().updateParams(component.id, { [param]: e.target.value })
        }
        className={INPUT}
      >
        {spec.options.map((option) => {
          // Opções conhecidas (cores do LED) são traduzidas; o valor guardado não muda.
          const key = `color.${option}`
          return (
            <option key={option} value={option}>
              {isMessageKey(key) ? t(key) : option}
            </option>
          )
        })}
      </select>
    </Field>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error: string | null
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-slate-400">{label}</span>
      {children}
      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
