/**
 * Resolução de um sistema linear A · x = b por eliminação de Gauss com pivotagem parcial.
 *
 * Ideia (como à mão):
 *  1. Para cada coluna k, escolher como "pivô" a linha com o MAIOR valor absoluto nessa coluna
 *     (pivotagem parcial) e trocá-la com a linha k. Isto evita dividir por zero ou por números
 *     muito pequenos, que dariam erros de arredondamento enormes.
 *  2. Anular todos os valores abaixo do pivô (subtraindo múltiplos da linha k).
 *  3. No fim a matriz é triangular superior: resolve-se de baixo para cima (substituição inversa).
 *
 * Se um pivô for (quase) zero, a matriz é SINGULAR: o sistema não tem solução única.
 * Num circuito isto quer dizer, por exemplo, falta de GND ou um nó solto.
 */

export type GaussResult =
  | { ok: true; x: number[] }
  | { ok: false; reason: 'singular'; /** Coluna (incógnita) onde falhou. */ column: number }

/** Tolerância relativa para considerar um pivô igual a zero. */
const RELATIVE_PIVOT_TOLERANCE = 1e-12

/**
 * Resolve A · x = b. Não altera `A` nem `b` (trabalha numa cópia).
 * @param A matriz quadrada n × n
 * @param b vetor de tamanho n
 */
export function solveLinearSystem(
  A: readonly (readonly number[])[],
  b: readonly number[],
): GaussResult {
  const n = b.length
  if (A.length !== n || A.some((line) => line.length !== n)) {
    throw new Error(`solveLinearSystem: A tem de ser ${n}×${n}`)
  }

  // Matriz aumentada [A | b], copiada para não estragar os dados de quem chama.
  const M: number[][] = A.map((line, i) => [...line, b[i]])

  // Escala da matriz, para a tolerância ser relativa (funciona com Ω, kΩ ou MΩ).
  let scale = 0
  for (const line of A) for (const value of line) scale = Math.max(scale, Math.abs(value))
  const tolerance = RELATIVE_PIVOT_TOLERANCE * (scale > 0 ? scale : 1)

  // 1 + 2: eliminação com pivotagem parcial
  for (let k = 0; k < n; k++) {
    let pivotRow = k
    for (let i = k + 1; i < n; i++) {
      if (Math.abs(M[i][k]) > Math.abs(M[pivotRow][k])) pivotRow = i
    }
    if (Math.abs(M[pivotRow][k]) < tolerance) {
      return { ok: false, reason: 'singular', column: k }
    }
    if (pivotRow !== k) [M[k], M[pivotRow]] = [M[pivotRow], M[k]]

    for (let i = k + 1; i < n; i++) {
      const factor = M[i][k] / M[k][k]
      if (factor === 0) continue
      for (let j = k; j <= n; j++) M[i][j] -= factor * M[k][j]
    }
  }

  // 3: substituição inversa
  const x = new Array<number>(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n]
    for (let j = i + 1; j < n; j++) sum -= M[i][j] * x[j]
    x[i] = sum / M[i][i]
  }
  return { ok: true, x }
}
