/**
 * Simulação TRANSITÓRIA completa de um projeto — é esta a função do botão "Transitório" (E10).
 *
 *   projeto ──► validateProject (modo transitório) ──► buildNetlist (C e L com o modelo no tempo)
 *           ──► solveTransient (Euler implícito, transient.ts) ──► formas de onda por componente
 *
 * Diferenças para o simulateDc:
 *   - o condensador e a bobina entram com i = C·du/dt e u = L·di/dt (não são aberto/fio);
 *   - o LED do MVP (modelo "conduz/bloqueado") não é suportado no tempo: usa-se o díodo real,
 *     cuja curva de Shockley o Newton-Raphson resolve em cada passo.
 *
 * Além das formas de onda devolve `final`: os valores no ÚLTIMO instante, no mesmo formato do
 * simulateDc — assim o painel de resultados e o brilho da cena funcionam sem mudanças.
 */

import type { Component, Project, TerminalId } from '../model'
import { buildNetlist } from '../netlist'
import { validateProject } from '../validation'
import { DIODE_ON_CURRENT, type ComponentResult, type SimulationIssue } from './simulateDc'
import { solveTransient, type ElementWaveform } from './transient'

export interface TransientSimulationOptions {
  /** Duração total, em s. */
  duration: number
  /** Passo de tempo, em s. */
  step: number
}

export type TransientSimulationResult =
  | {
      ok: true
      /** Instantes simulados, em s: 0, h, 2h, … */
      times: number[]
      /** Tensão, corrente e potência de cada componente (por ID), um valor por instante. */
      waveforms: Map<string, ElementWaveform>
      /** Resultados no último instante (como no simulateDc). */
      final: Map<string, ComponentResult>
      /** Tensão de cada terminal no último instante. */
      terminalVoltages: Map<TerminalId, number>
      issues: SimulationIssue[]
      duration: number
      step: number
    }
  | {
      ok: false
      issues: SimulationIssue[]
      /** Mensagem extra quando a falha vem do cálculo (ex.: passos a mais). */
      message?: string
      /** Código da falha do cálculo, se houver (ex.: 'invalid-options'). */
      code?: string
    }

export function simulateTransient(
  project: Pick<Project, 'components' | 'wires'>,
  options: TransientSimulationOptions,
): TransientSimulationResult {
  const validation = validateProject(project, { mode: 'transient' })
  const issues: SimulationIssue[] = [...validation.issues]
  for (const c of project.components) {
    if (c.kind !== 'led') continue
    issues.push({
      severity: 'error',
      code: 'led-in-transient',
      message: `${c.name}: o LED simples não entra no transitório. Usa um díodo.`,
      componentIds: [c.id],
      params: { name: c.name },
    })
  }
  if (issues.some((i) => i.severity === 'error')) return { ok: false, issues }

  const built = buildNetlist(project, { mode: 'transient' })
  if (!built.ok) return { ok: false, issues, message: 'Falta o GND.' }
  const solution = solveTransient(built.netlist, options)
  if (!solution.ok) {
    return { ok: false, issues, message: solution.error.message, code: solution.error.code }
  }

  const { times, nodeVoltages } = solution
  const last = times.length - 1
  const nodeVoltage = (t: TerminalId, k: number): number | undefined => {
    const node = built.nodeOfTerminal.get(t)
    return node === undefined ? undefined : (nodeVoltages[k]?.[node] ?? 0)
  }
  // Tensão a − b ao longo do tempo, para quem não tem elemento (interruptor aberto).
  const across = (c: Component, a: string, b: string): number[] =>
    times.map((_, k) => {
      const va = nodeVoltage(`${c.id}:${a}`, k)
      const vb = nodeVoltage(`${c.id}:${b}`, k)
      return va === undefined || vb === undefined ? 0 : va - vb
    })

  const waveforms = new Map<string, ElementWaveform>()
  const final = new Map<string, ComponentResult>()
  for (const c of project.components) {
    if (c.kind === 'ground') continue
    let w = solution.elements.get(c.id)
    if (!w && c.kind === 'switch') {
      const voltage = across(c, 'a', 'b')
      const zeros = times.map(() => 0)
      w = { voltage, current: zeros, power: zeros }
    }
    if (!w) continue
    waveforms.set(c.id, w)
    const result: ComponentResult = {
      voltage: w.voltage[last] ?? 0,
      current: w.current[last] ?? 0,
      power: w.power[last] ?? 0,
    }
    if (c.kind === 'diode') {
      result.diodeState = result.current >= DIODE_ON_CURRENT ? 'conducting' : 'blocked'
    }
    final.set(c.id, result)
  }

  const terminalVoltages = new Map<TerminalId, number>()
  for (const [t, node] of built.nodeOfTerminal) {
    terminalVoltages.set(t, nodeVoltages[last]?.[node] ?? 0)
  }

  return {
    ok: true,
    times,
    waveforms,
    final,
    terminalVoltages,
    issues,
    duration: options.duration,
    step: options.step,
  }
}
