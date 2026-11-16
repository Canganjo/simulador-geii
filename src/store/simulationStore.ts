import { create } from 'zustand'
import {
  simulateDc,
  simulateTransient,
  type ElementWaveform,
  type SimulationResult,
  type TransientSimulationOptions,
} from '../core/solver'
import type { Component, Wire } from '../core/model'
import { useCircuitStore } from './circuitStore'

/**
 * Resultado da última simulação.
 *
 *   Simular      → estado do circuito → core (simulateDc)        → `result` → painel de resultados
 *   Transitório  → estado do circuito → core (simulateTransient) → `result` (valores no instante
 *                                                                   final) + `transient` (curvas)
 *
 * `result === null` → ainda não se simulou (ou os resultados foram limpos).
 * `transient === null` → a última simulação foi DC (ou falhou).
 * Não entra no desfazer/refazer: é calculado a partir do circuito, não é uma edição.
 *
 * Recálculo automático (como num simulador "em direto"): depois de Simular, mudar só VALORES
 * (tensão da fonte com + / −, resistência, nome…) volta a calcular logo, com a mesma análise.
 * Mudar as LIGAÇÕES (fios, juntar/apagar componentes) limpa os resultados, como antes.
 */

/** Curvas de uma simulação no tempo (para o gráfico da E10-5). */
export interface TransientData {
  times: number[]
  /** Por ID de componente: tensão, corrente e potência em cada instante. */
  waveforms: Map<string, ElementWaveform>
  duration: number
  step: number
}

/** A última análise pedida (para a repetir sozinha quando um valor muda). */
export type LastRun = { mode: 'dc' } | { mode: 'transient'; options: TransientSimulationOptions }

interface SimulationState {
  result: SimulationResult | null
  transient: TransientData | null
  /** null = não há nada a repetir (ainda não se simulou, ou Parar / RAZ / circuito mudou). */
  lastRun: LastRun | null
  /** Calcula o circuito atual em DC (botão Simular). */
  run: () => void
  /** Calcula o circuito atual no tempo (botão Transitório). */
  runTransient: (options: TransientSimulationOptions) => void
  /** Limpa os resultados (Parar, RAZ, ou o circuito mudou). */
  clear: () => void
  /** Repete a última análise com o circuito atual (recálculo automático). */
  rerun: () => void
}

export const useSimulationStore = create<SimulationState>()((set, get) => ({
  result: null,
  transient: null,
  lastRun: null,
  run: () => {
    const { components, wires } = useCircuitStore.getState()
    set({ result: simulateDc({ components, wires }), transient: null, lastRun: { mode: 'dc' } })
  },
  runTransient: (options) => {
    const { components, wires } = useCircuitStore.getState()
    const r = simulateTransient({ components, wires }, options)
    const lastRun: LastRun = { mode: 'transient', options }
    if (!r.ok) {
      set({
        result: { ok: false, issues: r.issues, message: r.message },
        transient: null,
        lastRun,
      })
      return
    }
    set({
      // Os valores do último instante, no formato do DC: painel e cena funcionam como sempre.
      result: {
        ok: true,
        results: r.final,
        terminalVoltages: r.terminalVoltages,
        issues: r.issues,
      },
      transient: { times: r.times, waveforms: r.waveforms, duration: r.duration, step: r.step },
      lastRun,
    })
  },
  clear: () => set({ result: null, transient: null, lastRun: null }),
  rerun: () => {
    const last = get().lastRun
    if (last?.mode === 'dc') get().run()
    else if (last?.mode === 'transient') get().runTransient(last.options)
  },
}))

/** O que mudou no circuito, do ponto de vista dos resultados. */
export type CircuitChange = 'none' | 'layout' | 'values' | 'topology'

interface CircuitSnapshot {
  components: readonly Component[]
  wires: readonly Wire[]
}

/**
 * - 'topology': fios ou lista de componentes diferentes → os resultados deixam de valer;
 * - 'values': os mesmos componentes e fios, mas outro valor ou nome → recalcular;
 * - 'layout': só posição/rotação → os números continuam certos (o circuito elétrico é o mesmo);
 * - 'none': nada que interesse (ex.: só a seleção).
 */
export function circuitChange(now: CircuitSnapshot, before: CircuitSnapshot): CircuitChange {
  if (now.components === before.components && now.wires === before.wires) return 'none'
  if (now.wires !== before.wires) return 'topology'
  if (now.components.length !== before.components.length) return 'topology'
  let change: CircuitChange = 'none'
  for (let i = 0; i < now.components.length; i++) {
    const a = now.components[i]
    const b = before.components[i]
    if (!a || !b || a.id !== b.id || a.kind !== b.kind) return 'topology'
    if (a === b) continue
    if (a.params !== b.params || a.name !== b.name) change = 'values'
    else if (change === 'none') change = 'layout'
  }
  return change
}

// Circuito mudou depois de Simular: ligações → limpa (nunca mostrar números de um circuito que já
// não é o que está no ecrã); só valores → recalcula logo; só posições → os números mantêm-se.
useCircuitStore.subscribe((state, previous) => {
  const simulation = useSimulationStore.getState()
  if (simulation.result === null) return
  const change = circuitChange(state, previous)
  if (change === 'topology') simulation.clear()
  else if (change === 'values') simulation.rerun()
})
