/**
 * Circuitos NÃO lineares (díodos) — método de Newton-Raphson (etapa E10, fase 3 do motor).
 *
 * O PROBLEMA
 *   Um díodo real segue a equação de Shockley:  I = Is · (e^(U / (n·Vt)) − 1).
 *   Com uma exponencial no meio, o sistema deixa de ser A · x = b: não se resolve de uma vez.
 *
 * A IDEIA (como no SPICE)
 *   1. Adivinha-se a tensão U₀ de cada díodo (começa em 0 V).
 *   2. Perto de U₀, a curva do díodo parece uma RETA (a tangente):
 *          I(U) ≈ I(U₀) + g · (U − U₀)  =  g · U + Ieq
 *      com  g = dI/dU = Is/(n·Vt) · e^(U₀/(n·Vt))   (condutância)
 *      e    Ieq = I(U₀) − g · U₀                      (o que sobra)
 *      Uma reta g · U + Ieq é exatamente uma RESISTÊNCIA 1/g em paralelo com uma FONTE DE
 *      CORRENTE Ieq — dois elementos lineares que o MNA (mna.ts) já sabe resolver.
 *   3. Resolve-se esse circuito linear → nova tensão U₁ de cada díodo.
 *   4. Repete-se com U₁, U₂… até a tensão quase não mudar (|Uₖ₊₁ − Uₖ| < 1 µV).
 *
 * DOIS CUIDADOS
 *   - LIMITAR O SALTO: e^(U/(n·Vt)) cresce depressa demais (com U = 5 V dá ≈ 10⁴⁸). Se uma
 *     iteração pede um salto grande para cima, avança-se só "logaritmicamente" (função `limitJunction`,
 *     igual à `pnjlim` do SPICE). Assim nunca há números infinitos.
 *   - GMIN: uma condutância minúscula (10⁻¹² S) em paralelo com cada díodo, como no SPICE, para a
 *     matriz nunca ficar singular quando o díodo está bloqueado.
 */

import type { DiodeElement, Netlist, NetlistElement } from '../netlist'
import { solveDc, type DcSolution, type ElementResult } from './mna'

/** Tensão térmica Vt = k·T/q a 300 K (27 °C): 1,380649e-23 × 300 / 1,602176634e-19 V. */
export const THERMAL_VOLTAGE = (1.380649e-23 * 300) / 1.602176634e-19 // ≈ 0,025852 V

/** Condutância mínima em paralelo com cada díodo (S), como o GMIN do SPICE. */
export const GMIN = 1e-12

/** Paragem: a tensão de todos os díodos mudou menos do que isto (V). */
export const VOLTAGE_TOLERANCE = 1e-6

/** Máximo de iterações antes de desistir. */
export const MAX_ITERATIONS = 100

/** Corrente do díodo (Shockley + GMIN) para a tensão U. */
export function diodeCurrent(d: DiodeElement, u: number): number {
  const nVt = d.emissionCoefficient * THERMAL_VOLTAGE
  return d.saturationCurrent * Math.expm1(u / nVt) + GMIN * u
}

/** Condutância dI/dU do díodo para a tensão U. */
export function diodeConductance(d: DiodeElement, u: number): number {
  const nVt = d.emissionCoefficient * THERMAL_VOLTAGE
  return (d.saturationCurrent / nVt) * Math.exp(u / nVt) + GMIN
}

/**
 * Limita o salto de tensão de uma junção entre duas iterações (a `pnjlim` do SPICE).
 *
 * Acima da tensão crítica Vcrit (onde a curva começa a "subir a pique"), um salto de
 * `uOld` para `uNew` é trocado pelo salto que daria a mesma CORRENTE se a curva fosse a reta
 * tangente: uOld + n·Vt · ln(1 + (uNew − uOld)/(n·Vt)). Abaixo de Vcrit não se mexe.
 */
export function limitJunction(d: DiodeElement, uNew: number, uOld: number): number {
  const nVt = d.emissionCoefficient * THERMAL_VOLTAGE
  const vCrit = nVt * Math.log(nVt / (Math.SQRT2 * d.saturationCurrent))
  if (uNew <= vCrit || Math.abs(uNew - uOld) <= 2 * nVt) return uNew
  if (uOld > 0) {
    const arg = 1 + (uNew - uOld) / nVt
    return arg > 0 ? uOld + nVt * Math.log(arg) : vCrit
  }
  return nVt * Math.log(uNew / nVt)
}

/** IDs internos dos dois elementos que substituem um díodo em cada iteração. */
const conductanceId = (id: string) => `${id}#g`
const currentId = (id: string) => `${id}#ieq`

/**
 * Resolve um circuito DC que pode ter díodos. Sem díodos é exatamente `solveDc` (uma só passagem).
 *
 * Os resultados dos díodos vêm na mesma `elements` (por ID): tensão ânodo − cátodo, corrente do
 * ânodo para o cátodo (Shockley) e potência consumida. `iterations` diz quantas passagens foram.
 */
export function solveDcNonlinear(netlist: Netlist): DcSolution & { iterations: number } {
  const diodes = netlist.elements.filter((e): e is DiodeElement => e.type === 'diode')
  if (diodes.length === 0) return { ...solveDc(netlist), iterations: 1 }

  const invalid = diodes.find(
    (d) =>
      !(Number.isFinite(d.saturationCurrent) && d.saturationCurrent > 0) ||
      !(Number.isFinite(d.emissionCoefficient) && d.emissionCoefficient > 0),
  )
  if (invalid) {
    return {
      ok: false,
      error: {
        code: 'invalid-netlist',
        message: `${invalid.id}: Is e n do díodo têm de ser números > 0`,
        elementId: invalid.id,
      },
      iterations: 0,
    }
  }

  const linear = netlist.elements.filter((e) => e.type !== 'diode')
  // Tensão atual de cada díodo (começa em 0 V: todos "desligados").
  const u = new Map<string, number>(diodes.map((d) => [d.id, 0]))

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    // 1. Cada díodo → reta tangente em u: resistência 1/g + fonte de corrente Ieq (ânodo → cátodo).
    const companions: NetlistElement[] = diodes.flatMap((d) => {
      const u0 = u.get(d.id) ?? 0
      const g = diodeConductance(d, u0)
      const ieq = diodeCurrent(d, u0) - g * u0
      return [
        {
          type: 'resistor',
          id: conductanceId(d.id),
          nodeA: d.anode,
          nodeB: d.cathode,
          resistance: 1 / g,
        },
        { type: 'current-source', id: currentId(d.id), from: d.anode, to: d.cathode, current: ieq },
      ]
    })

    // 2. Resolver o circuito linear.
    const solution = solveDc({ nodeCount: netlist.nodeCount, elements: [...linear, ...companions] })
    if (!solution.ok) return { ...solution, iterations: iteration }
    const v = solution.nodeVoltages

    // 3. Novas tensões dos díodos; já convergiu?
    let converged = true
    for (const d of diodes) {
      const uOld = u.get(d.id) ?? 0
      const uNew = (v[d.anode] ?? 0) - (v[d.cathode] ?? 0)
      if (Math.abs(uNew - uOld) >= VOLTAGE_TOLERANCE) converged = false
      u.set(d.id, limitJunction(d, uNew, uOld))
    }

    if (converged) {
      // 4. Resultados: os elementos lineares ficam; as "retas" dão lugar ao díodo.
      const elements = new Map<string, ElementResult>()
      const internal = new Set(diodes.flatMap((d) => [conductanceId(d.id), currentId(d.id)]))
      for (const [id, r] of solution.elements) if (!internal.has(id)) elements.set(id, r)
      for (const d of diodes) {
        const voltage = (v[d.anode] ?? 0) - (v[d.cathode] ?? 0)
        // Corrente = a da reta (1/g + Ieq), que respeita EXATAMENTE a lei dos nós; como já
        // convergiu, difere da de Shockley menos do que g · 1 µV.
        const current =
          (solution.elements.get(conductanceId(d.id))?.current ?? 0) +
          (solution.elements.get(currentId(d.id))?.current ?? 0)
        elements.set(d.id, { voltage, current, power: voltage * current })
      }
      return { ok: true, nodeVoltages: v, elements, iterations: iteration }
    }
  }

  return {
    ok: false,
    error: {
      code: 'no-convergence',
      message:
        `O cálculo dos díodos não convergiu em ${MAX_ITERATIONS} iterações. ` +
        'Verifica os valores (fontes muito grandes, resistências quase nulas).',
    },
    iterations: MAX_ITERATIONS,
  }
}
