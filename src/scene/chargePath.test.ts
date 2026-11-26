import { describe, expect, it } from 'vitest'
import { chargeCount, makeChargePath, playbackIndex, pointAt, wrap } from './chargePath'

describe('caminho das cargas num fio', () => {
  // Fio em "L": (0,0) → (4,0) → (4,3). Comprimento = 4 + 3 = 7 células.
  const path = makeChargePath([
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 3 },
  ])

  it('mede o comprimento dos troços', () => {
    expect(path.length).toBeCloseTo(7, 12)
    expect(path.cumulative).toEqual([0, 4, 7])
  })

  it('encontra o ponto a uma distância do início, nos dois troços', () => {
    const p = { x: 0, y: 0 }
    expect(pointAt(path, 2, p)).toEqual({ x: 2, y: 0 }) // a meio do 1.º troço
    expect(pointAt(path, 4, p)).toEqual({ x: 4, y: 0 }) // no cotovelo
    expect(pointAt(path, 5.5, p)).toEqual({ x: 4, y: 1.5 }) // 1,5 células no 2.º troço
    expect(pointAt(path, 7, p)).toEqual({ x: 4, y: 3 }) // no fim
  })

  it('espaçamento constante: 7 células / 0,5 = 14 cargas; fio curto tem pelo menos 1', () => {
    expect(chargeCount(7)).toBe(14)
    expect(chargeCount(0.2)).toBe(1)
  })

  it('o resto dá a volta também para trás (cargas a andar ao contrário)', () => {
    expect(wrap(0.6, 0.5)).toBeCloseTo(0.1, 12)
    expect(wrap(-0.1, 0.5)).toBeCloseTo(0.4, 12)
  })

  it('transitório: 101 amostras em 5 s → a meio (2,5 s) mostra a amostra 50, depois recomeça', () => {
    expect(playbackIndex(0, 101, 5)).toBe(0)
    expect(playbackIndex(2.5, 101, 5)).toBe(50)
    expect(playbackIndex(5, 101, 5)).toBe(0) // recomeça
    expect(playbackIndex(4.999, 101, 5)).toBe(100)
    expect(playbackIndex(3, 1, 5)).toBe(0) // uma só amostra
  })
})
