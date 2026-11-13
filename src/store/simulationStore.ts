import { create } from 'zustand'
import { simulateDc, type SimulationResult } from '../core/solver'
import { useCircuitStore } from './circuitStore'

/**
 * Resultado da última simulação (botão Simular).
 *
 *   Simular → estado do circuito → core (simulateDc) → `result` → painel de resultados
 *
 * `result === null` → ainda não se simulou (ou os resultados foram limpos).
 * Não entra no desfazer/refazer: é calculado a partir do circuito, não é uma edição.
 */
interface SimulationState {
  result: SimulationResult | null
  /** Calcula o circuito atual. */
  run: () => void
  /** Limpa os resultados (Parar, RAZ, ou o circuito mudou). */
  clear: () => void
}

export const useSimulationStore = create<SimulationState>()((set) => ({
  result: null,
  run: () => {
    const { components, wires } = useCircuitStore.getState()
    set({ result: simulateDc({ components, wires }) })
  },
  clear: () => set({ result: null }),
}))

// Se o circuito mudar (mover, apagar, ligar um fio, desfazer…), os resultados deixam de valer:
// limpam-se, para nunca mostrar números de um circuito que já não é o que está no ecrã.
useCircuitStore.subscribe((state, previous) => {
  if (state.components !== previous.components || state.wires !== previous.wires) {
    if (useSimulationStore.getState().result !== null) useSimulationStore.getState().clear()
  }
})
