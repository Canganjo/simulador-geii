import { describe, expect, it } from 'vitest'
import { solveLinearSystem } from './gauss'

describe('solveLinearSystem (Gauss com pivotagem parcial)', () => {
  it('resolve um sistema 2×2 simples', () => {
    // 2x +  y = 5
    //  x + 3y = 10   → à mão: x = 1, y = 3
    const r = solveLinearSystem(
      [
        [2, 1],
        [1, 3],
      ],
      [5, 10],
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.x[0]).toBeCloseTo(1, 12)
    expect(r.x[1]).toBeCloseTo(3, 12)
  })

  it('precisa de trocar linhas quando o primeiro pivô é zero', () => {
    // 0x + 1y = 2
    // 1x + 1y = 5   → à mão: y = 2, x = 3
    // Sem pivotagem, a 1.ª linha obrigaria a dividir por 0.
    const r = solveLinearSystem(
      [
        [0, 1],
        [1, 1],
      ],
      [2, 5],
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.x[0]).toBeCloseTo(3, 12)
    expect(r.x[1]).toBeCloseTo(2, 12)
  })

  it('deteta uma matriz singular (linhas proporcionais)', () => {
    //  x + 2y = 3
    // 2x + 4y = 6   → a 2.ª equação é o dobro da 1.ª: infinitas soluções
    const r = solveLinearSystem(
      [
        [1, 2],
        [2, 4],
      ],
      [3, 6],
    )
    expect(r).toEqual({ ok: false, reason: 'singular', column: 1 })
  })

  it('não altera a matriz nem o vetor de entrada', () => {
    const A = [
      [0, 1],
      [1, 1],
    ]
    const b = [2, 5]
    solveLinearSystem(A, b)
    expect(A).toEqual([
      [0, 1],
      [1, 1],
    ])
    expect(b).toEqual([2, 5])
  })
})
