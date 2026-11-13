/**
 * Simulação DC completa de um projeto — é esta a função que o botão "Simular" vai chamar.
 *
 *   projeto ──► validateProject ──► (erros? pára) ──► buildNetlist ──► solveDc ──► resultados
 *                                                         ▲                │
 *                                                         └── LED mudou? ──┘
 *
 * LED no modelo simples (MVP): ou CONDUZ (fonte Vf + Rs em série) ou está BLOQUEADO (aberto).
 * Não sabemos à partida qual é o caso, por isso faz-se como à mão num TD:
 *   1. supõe-se que todos os LED conduzem e resolve-se;
 *   2. um LED a conduzir com corrente NEGATIVA (do cátodo para o ânodo) é impossível → bloqueado;
 *   3. um LED bloqueado com U ≥ Vf aos terminais teria de conduzir → passa a conduzir;
 *   4. repete-se (um LED de cada vez) até nenhum mudar.
 */

import type { Component, Project, TerminalId } from '../model'
import { buildNetlist, ledSourceId } from '../netlist'
import { validateProject, type ValidationIssue } from '../validation'
import { solveDc, type DcSolution } from './mna'

/** Margens numéricas: abaixo disto considera-se 0 (erros de arredondamento). */
const CURRENT_EPSILON = 1e-12 // A
const VOLTAGE_EPSILON = 1e-9 // V

export interface ComponentResult {
  /** Tensão aos terminais, em V (fonte: V+ − V−; LED: V(ânodo) − V(cátodo); outros: V(a) − V(b)). */
  voltage: number
  /** Corrente, em A (fonte: fornecida; LED: do ânodo para o cátodo; outros: de a para b). */
  current: number
  /** Potência em convenção recetor, em W (P > 0 consome, P < 0 fornece). */
  power: number
  /** Só para os LED: se está a conduzir (aceso) ou bloqueado (apagado). */
  ledState?: 'on' | 'off'
}

export type SimulationIssue =
  | ValidationIssue
  | {
      severity: 'warning'
      code: 'led-overcurrent'
      message: string
      componentIds: string[]
      /** { name, current, max } — correntes em A. */
      params?: Readonly<Record<string, string | number>>
    }

export type SimulationResult =
  | {
      ok: true
      /** Resultados por ID de componente (o GND não tem resultados). */
      results: Map<string, ComponentResult>
      /** Tensão de cada terminal em relação ao GND (terminais sem elementos não aparecem). */
      terminalVoltages: Map<TerminalId, number>
      /** Avisos (circuito aberto, ponta solta, LED em sobrecorrente…). */
      issues: SimulationIssue[]
    }
  | {
      ok: false
      issues: SimulationIssue[]
      /** Mensagem extra quando a falha vem do cálculo e não da validação. */
      message?: string
    }

export function simulateDc(project: Pick<Project, 'components' | 'wires'>): SimulationResult {
  const validation = validateProject(project)
  if (!validation.ok) return { ok: false, issues: validation.issues }

  const leds = project.components.filter((c) => c.kind === 'led')
  const ledOff = new Set<string>()
  // Cada LED muda no máximo poucas vezes; este limite só existe para nunca ficar preso.
  const maxIterations = 2 * leds.length + 10

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const built = buildNetlist(project, { ledOff })
    if (!built.ok) return { ok: false, issues: validation.issues, message: 'Falta o GND.' }
    const solution = solveDc(built.netlist)
    if (!solution.ok) {
      return { ok: false, issues: validation.issues, message: solution.error.message }
    }

    const vAt = (t: TerminalId): number | undefined => {
      const node = built.nodeOfTerminal.get(t)
      return node === undefined ? undefined : solution.nodeVoltages[node]
    }

    // Verifica a suposição de cada LED; corrige só o primeiro que estiver errado.
    const wrong = leds.find((d) => {
      if (d.kind !== 'led') return false
      if (ledOff.has(d.id)) {
        const u = voltageAcross(vAt, d, 'anodo', 'catodo')
        return u !== undefined && u >= d.params.forwardVoltage + VOLTAGE_EPSILON
      }
      return ledCurrent(solution, d.id) < -CURRENT_EPSILON
    })
    if (wrong) {
      if (ledOff.has(wrong.id)) ledOff.delete(wrong.id)
      else ledOff.add(wrong.id)
      continue
    }

    // Tudo coerente → resultados por componente.
    const results = new Map<string, ComponentResult>()
    const issues: SimulationIssue[] = [...validation.issues]
    for (const c of project.components) {
      const r = componentResult(c, solution, vAt, ledOff)
      if (!r) continue
      results.set(c.id, r)
      if (c.kind === 'led' && r.current > c.params.maxCurrent) {
        issues.push({
          severity: 'warning',
          code: 'led-overcurrent',
          message:
            `${c.name}: corrente de ${round(r.current)} A acima da corrente máxima ` +
            `(${c.params.maxCurrent} A) — o LED queimava.`,
          componentIds: [c.id],
          params: { name: c.name, current: r.current, max: c.params.maxCurrent },
        })
      }
    }
    const terminalVoltages = new Map<TerminalId, number>()
    for (const [t, node] of built.nodeOfTerminal) {
      terminalVoltages.set(t, solution.nodeVoltages[node] ?? 0)
    }
    return { ok: true, results, terminalVoltages, issues }
  }

  return {
    ok: false,
    issues: validation.issues,
    message: 'O cálculo dos LED não estabilizou (os LED mudam de estado sem parar).',
  }
}

type Solved = Extract<DcSolution, { ok: true }>
type VoltageAt = (t: TerminalId) => number | undefined

/** Corrente no LED do ânodo para o cátodo = corrente que ENTRA no + da sua fonte Vf. */
function ledCurrent(solution: Solved, componentId: string): number {
  // O solver dá a corrente FORNECIDA pela fonte (sai pelo +); a que entra é a simétrica.
  return -(solution.elements.get(ledSourceId(componentId))?.current ?? 0)
}

function voltageAcross(vAt: VoltageAt, c: Component, a: string, b: string): number | undefined {
  const va = vAt(`${c.id}:${a}`)
  const vb = vAt(`${c.id}:${b}`)
  return va === undefined || vb === undefined ? undefined : va - vb
}

function componentResult(
  c: Component,
  solution: Solved,
  vAt: VoltageAt,
  ledOff: ReadonlySet<string>,
): ComponentResult | undefined {
  switch (c.kind) {
    case 'ground':
      return undefined
    case 'dc-source':
    case 'resistor':
    case 'lamp':
      return solution.elements.get(c.id)
    case 'switch': {
      const closed = solution.elements.get(c.id)
      if (closed) return closed
      // Aberto: há tensão aos terminais, mas nenhuma corrente.
      return { voltage: voltageAcross(vAt, c, 'a', 'b') ?? 0, current: 0, power: 0 }
    }
    case 'led': {
      const voltage = voltageAcross(vAt, c, 'anodo', 'catodo') ?? 0
      if (ledOff.has(c.id)) return { voltage, current: 0, power: 0, ledState: 'off' }
      const current = ledCurrent(solution, c.id)
      return { voltage, current, power: voltage * current, ledState: 'on' }
    }
  }
}

/** Arredonda para 4 algarismos significativos (só para as mensagens). */
function round(x: number): number {
  return Number(x.toPrecision(4))
}
