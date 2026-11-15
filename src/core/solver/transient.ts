/**
 * Regime TRANSITÓRIO: condensadores e bobinas ao longo do tempo (etapa E10, fase 4 do motor).
 *
 * O PROBLEMA
 *   Condensador: i = C · du/dt.   Bobina: u = L · di/dt.
 *   As derivadas fazem com que o circuito dependa do que aconteceu ANTES: não há uma só solução,
 *   há uma evolução no tempo (carga de um condensador, subida da corrente numa bobina…).
 *
 * A IDEIA: EULER IMPLÍCITO, PASSO FIXO h (o tempo avança aos saltos: 0, h, 2h, 3h…)
 *   Troca-se a derivada por uma diferença entre o passo novo (n+1) e o anterior (n):
 *
 *   Condensador:  i = C · (u − uₙ) / h  =  (C/h) · u − (C/h) · uₙ
 *     → uma RESISTÊNCIA h/C em paralelo com uma FONTE DE CORRENTE −(C/h)·uₙ (de a para b).
 *
 *   Bobina:       u = L · (i − iₙ) / h   →   i = (h/L) · u + iₙ
 *     → uma RESISTÊNCIA L/h em paralelo com uma FONTE DE CORRENTE iₙ (de a para b).
 *
 *   Em cada passo o circuito fica só com resistências e fontes (e díodos): resolve-se com o MNA
 *   (ou o Newton-Raphson se houver díodos), guarda-se uₙ₊₁ e iₙ₊₁, e avança-se para o passo seguinte.
 *
 * PORQUÊ "IMPLÍCITO"
 *   Usa-se a corrente/tensão do passo NOVO (desconhecida, resolvida pelo sistema). É estável para
 *   qualquer h: nunca "explode", mesmo com um passo grande (só fica menos exato).
 *   O erro é proporcional a h (método de 1.ª ordem): passo duas vezes mais pequeno → erro ≈ metade.
 *
 * ESTADO INICIAL (t = 0)
 *   Condensador com a tensão `initialVoltage` (0 = descarregado); bobina com a corrente
 *   `initialCurrent` (0). O ponto t = 0 dos resultados é o circuito nesse instante: o condensador
 *   comporta-se como uma fonte de tensão uₒ e a bobina como uma fonte de corrente iₒ.
 */

import type { Netlist, NetlistElement } from '../netlist'
import type { DcSolveError } from './mna'
import { solveDcNonlinear } from './newton'

/** Número máximo de passos de uma simulação (proteção contra durações/passos absurdos). */
export const MAX_TRANSIENT_STEPS = 100_000

export interface TransientOptions {
  /** Passo de tempo h, em s (> 0). */
  step: number
  /** Duração total, em s (> 0). O número de passos é duration / step (arredondado). */
  duration: number
}

/** Evolução de um componente: um valor por instante de `times`. */
export interface ElementWaveform {
  voltage: number[]
  current: number[]
  power: number[]
}

export type TransientResult =
  | {
      ok: true
      /** Instantes simulados, em s: 0, h, 2h, … */
      times: number[]
      /** nodeVoltages[k][n] = tensão do nó n no instante times[k] (n = 0 é o GND). */
      nodeVoltages: number[][]
      /** Formas de onda por ID de elemento (os elementos internos não aparecem). */
      elements: Map<string, ElementWaveform>
    }
  | {
      ok: false
      error: DcSolveError | { code: 'invalid-options'; message: string }
      /** Instante em que o cálculo falhou (s), se já tinha começado. */
      time?: number
    }

/** IDs internos dos elementos que substituem um condensador/bobina em cada passo. */
const resistorId = (id: string) => `${id}#r`
const memoryId = (id: string) => `${id}#mem`

/** Resistência que faz de condensador/bobina em t = 0 (quase uma fonte ideal, nunca singular). */
const TINY = 1e-3 // Ω (mais pequeno e o Gauss acha a matriz "singular": pivô relativo < 1e-12)
const HUGE = 1e9 // Ω

/**
 * Simula o circuito de t = 0 até `duration` com passo `step`.
 * Sem condensadores nem bobinas, todos os instantes dão o mesmo resultado (regime DC).
 */
export function solveTransient(netlist: Netlist, options: TransientOptions): TransientResult {
  const { step, duration } = options
  if (!(Number.isFinite(step) && step > 0 && Number.isFinite(duration) && duration > 0)) {
    return {
      ok: false,
      error: { code: 'invalid-options', message: 'O passo e a duração têm de ser números > 0.' },
    }
  }
  const steps = Math.round(duration / step)
  if (steps < 1 || steps > MAX_TRANSIENT_STEPS) {
    return {
      ok: false,
      error: {
        code: 'invalid-options',
        message:
          `A simulação teria ${steps} passos (duração / passo); ` +
          `tem de ficar entre 1 e ${MAX_TRANSIENT_STEPS}.`,
      },
    }
  }
  const invalid = netlist.elements.find(
    (e) =>
      (e.type === 'capacitor' && !(Number.isFinite(e.capacitance) && e.capacitance > 0)) ||
      (e.type === 'inductor' && !(Number.isFinite(e.inductance) && e.inductance > 0)),
  )
  if (invalid) {
    return {
      ok: false,
      error: {
        code: 'invalid-netlist',
        message: `${invalid.id}: C e L têm de ser números > 0`,
        elementId: invalid.id,
      },
    }
  }

  // Estado: tensão de cada condensador e corrente de cada bobina.
  const capVoltage = new Map<string, number>()
  const indCurrent = new Map<string, number>()
  for (const e of netlist.elements) {
    if (e.type === 'capacitor') capVoltage.set(e.id, e.initialVoltage ?? 0)
    if (e.type === 'inductor') indCurrent.set(e.id, e.initialCurrent ?? 0)
  }

  const times: number[] = []
  const nodeVoltages: number[][] = []
  const elements = new Map<string, ElementWaveform>()
  const record = (id: string, voltage: number, current: number, power: number) => {
    let w = elements.get(id)
    if (!w) {
      w = { voltage: [], current: [], power: [] }
      elements.set(id, w)
    }
    w.voltage.push(voltage)
    w.current.push(current)
    w.power.push(power)
  }

  for (let k = 0; k <= steps; k++) {
    const time = k * step
    // k = 0: instante inicial — condensador = fonte de tensão u₀, bobina = fonte de corrente i₀
    //        (exato). Se isso não tiver solução (ex.: condensador diretamente numa fonte de
    //        tensão), usa-se uma resistência minúscula / enorme no lugar da fonte ideal.
    // k ≥ 1: um passo de Euler implícito a partir do estado anterior.
    const mode = k === 0 ? 'initial' : 'euler'
    let solution = solveDcNonlinear({
      nodeCount: netlist.nodeCount,
      elements: stepElements(netlist, mode, step, capVoltage, indCurrent),
    })
    if (!solution.ok && k === 0) {
      solution = solveDcNonlinear({
        nodeCount: netlist.nodeCount,
        elements: stepElements(netlist, 'initial-approx', step, capVoltage, indCurrent),
      })
    }
    if (!solution.ok) return { ok: false, error: solution.error, time }

    const v = solution.nodeVoltages
    const results = solution.elements
    times.push(time)
    nodeVoltages.push(v)

    for (const e of netlist.elements) {
      if (e.type === 'capacitor' || e.type === 'inductor') {
        const voltage =
          k === 0 && e.type === 'capacitor'
            ? (capVoltage.get(e.id) ?? 0)
            : (v[e.nodeA] ?? 0) - (v[e.nodeB] ?? 0)
        // Corrente de a para b = soma das correntes dos elementos que o substituem.
        // (Uma fonte de tensão dá a corrente FORNECIDA, que sai pelo + = a: aqui é a que entra.)
        const r = results.get(resistorId(e.id))?.current ?? 0
        const mem = results.get(memoryId(e.id))
        const memCurrent =
          k === 0 && e.type === 'capacitor' && results.get(resistorId(e.id)) === undefined
            ? -(mem?.current ?? 0)
            : (mem?.current ?? 0)
        const current =
          k === 0 && e.type === 'inductor' ? (indCurrent.get(e.id) ?? 0) : r + memCurrent
        // O estado só avança nos passos de Euler (em t = 0 é o estado inicial, exato).
        if (k > 0) {
          if (e.type === 'capacitor') capVoltage.set(e.id, voltage)
          else indCurrent.set(e.id, current)
        }
        record(e.id, voltage, current, voltage * current)
      } else {
        const r = results.get(e.id)
        if (r) record(e.id, r.voltage, r.current, r.power)
      }
    }
  }

  return { ok: true, times, nodeVoltages, elements }
}

/**
 * Os elementos de um instante: cada condensador/bobina é trocado pelo seu equivalente.
 *   'euler'          → resistência (h/C ou L/h) + fonte de corrente com a memória do passo anterior;
 *   'initial'        → fonte de tensão u₀ (condensador) / fonte de corrente i₀ (bobina), exatas;
 *   'initial-approx' → o mesmo, mas com resistências 1 mΩ / 1 GΩ (nunca dá matriz singular).
 */
function stepElements(
  netlist: Netlist,
  mode: 'euler' | 'initial' | 'initial-approx',
  step: number,
  capVoltage: ReadonlyMap<string, number>,
  indCurrent: ReadonlyMap<string, number>,
): NetlistElement[] {
  return netlist.elements.flatMap((e): NetlistElement[] => {
    if (e.type === 'capacitor') {
      const u0 = capVoltage.get(e.id) ?? 0
      if (mode === 'initial') {
        return [
          {
            type: 'voltage-source',
            id: memoryId(e.id),
            plus: e.nodeA,
            minus: e.nodeB,
            voltage: u0,
          },
        ]
      }
      const r = mode === 'euler' ? step / e.capacitance : TINY
      return [
        { type: 'resistor', id: resistorId(e.id), nodeA: e.nodeA, nodeB: e.nodeB, resistance: r },
        // i = u/r − u₀/r → fonte de a para b com −u₀/r
        {
          type: 'current-source',
          id: memoryId(e.id),
          from: e.nodeA,
          to: e.nodeB,
          current: -u0 / r,
        },
      ]
    }
    if (e.type === 'inductor') {
      const i0 = indCurrent.get(e.id) ?? 0
      const source: NetlistElement = {
        type: 'current-source',
        id: memoryId(e.id),
        from: e.nodeA,
        to: e.nodeB,
        current: i0,
      }
      if (mode === 'initial') return [source]
      const r = mode === 'euler' ? e.inductance / step : HUGE
      return [
        { type: 'resistor', id: resistorId(e.id), nodeA: e.nodeA, nodeB: e.nodeB, resistance: r },
        source,
      ]
    }
    return [e]
  })
}
