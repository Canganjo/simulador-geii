/**
 * Simulação DC completa de um projeto — é esta a função que o botão "Simular" vai chamar.
 *
 *   projeto ──► validateProject ──► (erros? pára) ──► buildNetlist ──► solveDcNonlinear ──► resultados
 *                                                         ▲                │
 *                                                         └── LED mudou? ──┘
 *
 * LED no modelo simples (MVP): ou CONDUZ (fonte Vf + Rs em série) ou está BLOQUEADO (aberto).
 * Não sabemos à partida qual é o caso, por isso faz-se como à mão num TD:
 *   1. supõe-se que todos os LED conduzem e resolve-se;
 *   2. um LED a conduzir com corrente NEGATIVA (do cátodo para o ânodo) é impossível → bloqueado;
 *   3. um LED bloqueado com U ≥ Vf aos terminais teria de conduzir → passa a conduzir;
 *   4. repete-se (um LED de cada vez) até nenhum mudar.
 *
 * Fonte DC com limite de corrente (D-013), como uma fonte de bancada — o mesmo ciclo:
 *   - em CV (tensão constante) a fornecer mais do que Imax → passa a CC (corrente = Imax);
 *   - em CC com U = V+ − V− acima da tensão regulada → volta a CV.
 *
 * Díodo real (E10): não precisa deste ciclo — a curva de Shockley é resolvida dentro de
 * `solveDcNonlinear` (Newton-Raphson, newton.ts). Sem díodos, é o `solveDc` de sempre.
 */

import type { Component, Project, TerminalId } from '../model'
import { buildNetlist, ledSourceId } from '../netlist'
import { validateProject, type ValidationIssue } from '../validation'
import { type DcSolution } from './mna'
import { solveDcNonlinear } from './newton'

/** Margens numéricas: abaixo disto considera-se 0 (erros de arredondamento). */
const CURRENT_EPSILON = 1e-12 // A
const VOLTAGE_EPSILON = 1e-9 // V
/** Um díodo real "conduz" a partir de 1 µA (abaixo disso é só a fuga de saturação). */
export const DIODE_ON_CURRENT = 1e-6 // A

export interface ComponentResult {
  /** Tensão aos terminais, em V (fonte: V+ − V−; LED: V(ânodo) − V(cátodo); outros: V(a) − V(b)). */
  voltage: number
  /** Corrente, em A (fonte: fornecida; LED: do ânodo para o cátodo; outros: de a para b). */
  current: number
  /** Potência em convenção recetor, em W (P > 0 consome, P < 0 fornece). */
  power: number
  /** Só para os LED: se está a conduzir (aceso) ou bloqueado (apagado). */
  ledState?: 'on' | 'off'
  /** Só para os díodos reais: conduz (I ≥ 1 µA) ou bloqueado. */
  diodeState?: 'conducting' | 'blocked'
  /** Só para as fontes DC: CV (tensão regulada) ou CC (no limite de corrente). */
  sourceMode?: 'cv' | 'cc'
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
  | {
      /** Resistência a dissipar mais do que a potência nominal: aquecia demais (queimava). */
      severity: 'warning'
      code: 'resistor-overpower'
      message: string
      componentIds: string[]
      /** { name, power, max } — W. */
      params?: Readonly<Record<string, string | number>>
    }
  | {
      /** Fonte em CC: atingiu o limite de corrente e a tensão caiu abaixo da regulada. */
      severity: 'warning'
      code: 'source-current-limit'
      message: string
      componentIds: string[]
      /** { name, limit, voltage } — A e V. */
      params?: Readonly<Record<string, string | number>>
    }
  | {
      /** Transitório: a fonte não limita a corrente no tempo; houve um pico acima de Imax. */
      severity: 'warning'
      code: 'source-limit-transient'
      message: string
      componentIds: string[]
      /** { name, current, max } — A. */
      params?: Readonly<Record<string, string | number>>
    }
  | {
      /** Transitório (E10): o LED simples (conduz/bloqueado) não tem modelo no tempo. */
      severity: 'error'
      code: 'led-in-transient'
      message: string
      componentIds: string[]
      /** { name } */
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
  const limited = project.components.filter(
    (c) => c.kind === 'dc-source' && c.params.currentLimit !== undefined,
  )
  const sourceCc = new Set<string>()
  // Cada LED/fonte muda no máximo poucas vezes; este limite só existe para nunca ficar preso.
  const maxIterations = 2 * (leds.length + limited.length) + 10

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const built = buildNetlist(project, { ledOff, sourceCc })
    if (!built.ok) return { ok: false, issues: validation.issues, message: 'Falta o GND.' }
    const solution = solveDcNonlinear(built.netlist)
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

    // O mesmo para as fontes com limite: CV a dar demais → CC; CC acima da tensão regulada → CV.
    const wrongSource = limited.find((s) => {
      if (s.kind !== 'dc-source' || s.params.currentLimit === undefined) return false
      if (sourceCc.has(s.id)) {
        const u = voltageAcross(vAt, s, '+', '-')
        return u !== undefined && u > s.params.voltage + VOLTAGE_EPSILON
      }
      const supplied = solution.elements.get(s.id)?.current ?? 0
      return supplied > s.params.currentLimit * (1 + 1e-9) + CURRENT_EPSILON
    })
    if (wrongSource) {
      if (sourceCc.has(wrongSource.id)) sourceCc.delete(wrongSource.id)
      else sourceCc.add(wrongSource.id)
      continue
    }

    // Tudo coerente → resultados por componente.
    const results = new Map<string, ComponentResult>()
    const issues: SimulationIssue[] = [...validation.issues]
    for (const c of project.components) {
      const r = componentResult(c, solution, vAt, ledOff, sourceCc)
      if (!r) continue
      results.set(c.id, r)
      if (c.kind === 'dc-source' && r.sourceMode === 'cc') {
        issues.push({
          severity: 'warning',
          code: 'source-current-limit',
          message:
            `${c.name}: limite de corrente atingido (CC) — a fonte dá só ${round(r.current)} A ` +
            `e a tensão cai para ${round(r.voltage)} V.`,
          componentIds: [c.id],
          params: { name: c.name, limit: r.current, voltage: r.voltage },
        })
      }
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
      const rated = c.kind === 'resistor' ? c.params.ratedPower : undefined
      if (rated !== undefined && r.power > rated * (1 + 1e-9)) {
        issues.push({
          severity: 'warning',
          code: 'resistor-overpower',
          message:
            `${c.name}: dissipa ${round(r.power)} W, acima da potência nominal ` +
            `(${rated} W) — a resistência aquecia demais.`,
          componentIds: [c.id],
          params: { name: c.name, power: r.power, max: rated },
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
    message:
      'O cálculo dos LED/fontes não estabilizou (os LED ou as fontes mudam de estado sem parar).',
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
  sourceCc: ReadonlySet<string>,
): ComponentResult | undefined {
  switch (c.kind) {
    case 'ground':
      return undefined
    case 'dc-source': {
      const r = solution.elements.get(c.id)
      if (!r) return undefined
      if (!sourceCc.has(c.id)) return { ...r, sourceMode: 'cv' }
      // Em CC é uma fonte de corrente na netlist (de − para +): reescreve-se como fonte DC,
      // U = V+ − V−, I = Imax fornecida, P = −U·I (fornece).
      const voltage = voltageAcross(vAt, c, '+', '-') ?? 0
      return { voltage, current: r.current, power: -voltage * r.current, sourceMode: 'cc' }
    }
    case 'resistor':
    case 'lamp':
    case 'inductor': // em DC é um fio de 1 mΩ: a corrente é a que passa por ele
    case 'voltmeter': // 10 MΩ: U é a leitura
    case 'ammeter': // 1 mΩ: I é a leitura (positiva se entra pelo +)
      return solution.elements.get(c.id)
    case 'capacitor':
      // Em DC é um circuito aberto: tensão aos terminais, corrente nula.
      return { voltage: voltageAcross(vAt, c, 'a', 'b') ?? 0, current: 0, power: 0 }
    case 'diode': {
      const r = solution.elements.get(c.id)
      if (!r) return undefined
      return { ...r, diodeState: r.current >= DIODE_ON_CURRENT ? 'conducting' : 'blocked' }
    }
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
