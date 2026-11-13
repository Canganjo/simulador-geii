import {
  Activity,
  CircleAlert,
  PanelBottomClose,
  PanelBottomOpen,
  TriangleAlert,
} from 'lucide-react'
import type { Component } from '../core/model'
import type { SimulationIssue } from '../core/solver'
import { useCircuitStore } from '../store/circuitStore'
import { useLanguageStore } from '../store/languageStore'
import { COLLAPSED_SIZE } from '../store/panelSizes'
import { useSimulationStore } from '../store/simulationStore'
import { formatSi } from './formatSi'
import { decimalSeparator, useT } from './i18n'
import { issueText } from './issueText'

interface Props {
  open: boolean
  onToggle: () => void
  /** Altura quando aberto, em px (puxa-se a borda de cima para mudar). */
  height: number
}

/** Painel de resultados (em baixo). Recolhido, fica só o cabeçalho com o botão para abrir. */
export function ResultsPanel({ open, onToggle, height }: Props) {
  const t = useT()
  const label = open ? t('results.collapse') : t('results.expand')

  return (
    <section
      aria-label={t('results.label')}
      style={{ height: open ? height : COLLAPSED_SIZE.results }}
      className="shrink-0 overflow-hidden border-t border-slate-700 bg-slate-800 transition-[height]"
    >
      <div className="flex h-9 items-center justify-between px-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Activity className="size-4" aria-hidden />
          {t('results.label')}
        </h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          title={label}
          className="rounded p-1 text-slate-300 hover:bg-slate-700"
        >
          {open ? <PanelBottomClose className="size-5" /> : <PanelBottomOpen className="size-5" />}
          <span className="sr-only">{label}</span>
        </button>
      </div>

      {open && (
        <div className="h-[calc(100%-2.25rem)] overflow-y-auto px-3 pb-2 text-sm">
          <SimulationOutput />
        </div>
      )}
    </section>
  )
}

/** O conteúdo do painel: a dica (antes de simular), as mensagens e a tabela U, I, R, P. */
function SimulationOutput() {
  const t = useT()
  const result = useSimulationStore((s) => s.result)
  const components = useCircuitStore((s) => s.components)
  const decimal = decimalSeparator(useLanguageStore((s) => s.language))

  if (result === null) {
    return (
      <p className="text-slate-400">
        {t('results.hintBefore')} <strong className="text-slate-200">{t('action.simulate')}</strong>{' '}
        {t('results.hintAfter')}
      </p>
    )
  }

  // Pela ordem dos componentes no circuito (R1, R2… como foram criados); o GND não tem linha.
  const rows = result.ok
    ? components.flatMap((c) => {
        const r = result.results.get(c.id)
        return r ? [{ component: c, result: r }] : []
      })
    : []

  return (
    <div className="flex flex-col gap-2" data-testid="simulation-output" data-ok={result.ok}>
      {(result.issues.length > 0 || (!result.ok && result.message)) && (
        <ul className="flex flex-col gap-1">
          {result.issues.map((issue, i) => (
            <IssueRow key={i} issue={issue} text={issueText(issue, t, decimal)} />
          ))}
          {!result.ok && result.message && (
            <li className="flex items-start gap-2 text-red-300">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {t('results.calcFailed', { detail: result.message })}
            </li>
          )}
        </ul>
      )}

      {rows.length > 0 && (
        <table className="w-full max-w-2xl text-left tabular-nums" data-testid="results-table">
          <thead className="text-xs text-slate-400">
            <tr>
              <th className="py-1 pr-3 font-medium">{t('results.component')}</th>
              <th className="py-1 pr-3 font-medium">U</th>
              <th className="py-1 pr-3 font-medium">I</th>
              <th className="py-1 pr-3 font-medium">R</th>
              <th className="py-1 font-medium">P</th>
            </tr>
          </thead>
          <tbody className="text-slate-200">
            {rows.map(({ component, result: r }) => (
              <tr
                key={component.id}
                data-component={component.name}
                className="border-t border-slate-700"
              >
                <th scope="row" className="py-1 pr-3 font-semibold">
                  {component.name}
                  {r.ledState && (
                    <span
                      className={`ml-2 rounded px-1.5 py-0.5 text-xs font-medium ${
                        r.ledState === 'on'
                          ? 'bg-amber-400/20 text-amber-300'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {r.ledState === 'on' ? t('results.ledOn') : t('results.ledOff')}
                    </span>
                  )}
                </th>
                <td className="py-1 pr-3">{formatSi(r.voltage, 'V', 3, decimal)}</td>
                <td className="py-1 pr-3">{formatSi(r.current, 'A', 3, decimal)}</td>
                <td className="py-1 pr-3">{resistanceText(component, decimal)}</td>
                <td className="py-1">{formatSi(r.power, 'W', 3, decimal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

/** Uma mensagem do motor: clicar seleciona o (primeiro) componente envolvido na cena. */
function IssueRow({ issue, text }: { issue: SimulationIssue; text: string }) {
  const t = useT()
  const error = issue.severity === 'error'
  const Icon = error ? CircleAlert : TriangleAlert
  const target = issue.componentIds[0]

  return (
    <li>
      <button
        type="button"
        disabled={target === undefined}
        onClick={() => target !== undefined && useCircuitStore.getState().select(target)}
        data-severity={issue.severity}
        className={`flex w-full items-start gap-2 rounded px-1 py-0.5 text-left enabled:hover:bg-slate-700 ${
          error ? 'text-red-300' : 'text-amber-300'
        }`}
      >
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          <span className="sr-only">{error ? t('results.error') : t('results.warning')}: </span>
          {text}
        </span>
      </button>
    </li>
  )
}

/**
 * Coluna R: a resistência do componente (resistência: o valor; lâmpada: U²/P nominais, como no
 * modelo do core). Para a fonte, o interruptor e o LED não faz sentido → "—".
 */
function resistanceText(c: Component, decimal: ',' | '.'): string {
  if (c.kind === 'resistor') return formatSi(c.params.resistance, 'Ω', 3, decimal)
  if (c.kind === 'lamp') {
    return formatSi(c.params.ratedVoltage ** 2 / c.params.ratedPower, 'Ω', 3, decimal)
  }
  return '—'
}
