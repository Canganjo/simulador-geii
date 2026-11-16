import { create } from 'zustand'
import {
  simulateDc,
  simulateTransient,
  type ElementWaveform,
  type SimulationResult,
  type TransientSimulationOptions,
} from '../core/solver'
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
 */

/** Curvas de uma simulação no tempo (para o gráfico da E10-5). */
export interface TransientData {
  times: number[]
  /** Por ID de componente: tensão, corrente e potência em cada instante. */
  waveforms: Map<string, ElementWaveform>
  duration: number
  step: number
}

interface SimulationState {
  result: SimulationResult | null
  transient: TransientData | null
  /** Calcula o circuito atual em DC (botão Simular). */
  run: () => void
  /** Calcula o circuito atual no tempo (botão Transitório). */
  runTransient: (options: TransientSimulationOptions) => void
  /** Limpa os resultados (Parar, RAZ, ou o circuito mudou). */
  clear: () => void
}

export const useSimulationStore = create<SimulationState>()((set) => ({
  result: null,
  transient: null,
  run: () => {
    const { components, wires } = useCircuitStore.getState()
    set({ result: simulateDc({ components, wires }), transient: null })
  },
  runTransient: (options) => {
    const { components, wires } = useCircuitStore.getState()
    const r = simulateTransient({ components, wires }, options)
    if (!r.ok) {
      set({ result: { ok: false, issues: r.issues, message: r.message }, transient: null })
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
    })
  },
  clear: () => set({ result: null, transient: null }),
}))

// Se o circuito mudar (mover, apagar, ligar um fio, desfazer…), os resultados deixam de valer:
// limpam-se, para nunca mostrar números de um circuito que já não é o que está no ecrã.
useCircuitStore.subscribe((state, previous) => {
  if (state.components !== previous.components || state.wires !== previous.wires) {
    if (useSimulationStore.getState().result !== null) useSimulationStore.getState().clear()
  }
})
