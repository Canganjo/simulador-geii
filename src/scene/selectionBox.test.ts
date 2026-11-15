import { describe, expect, it } from 'vitest'
import { createComponent } from '../core/library'
import type { Component } from '../core/model'
import { idsInsideRect, isDrag, rectFromCorners } from './selectionBox'

describe('retângulo de seleção', () => {
  it('funciona em qualquer sentido (arrastar para a esquerda/cima também)', () => {
    const r = { left: 10, top: 20, width: 90, height: 30 }
    expect(rectFromCorners({ x: 10, y: 20 }, { x: 100, y: 50 })).toEqual(r)
    expect(rectFromCorners({ x: 100, y: 50 }, { x: 10, y: 20 })).toEqual(r)
    expect(rectFromCorners({ x: 100, y: 20 }, { x: 10, y: 50 })).toEqual(r)
  })

  it('mexer até 4 px é um clique; mais do que isso é um arrasto', () => {
    expect(isDrag({ x: 0, y: 0 }, { x: 4, y: -4 })).toBe(false)
    expect(isDrag({ x: 0, y: 0 }, { x: 5, y: 0 })).toBe(true)
  })

  it('seleciona só os componentes com o centro dentro do retângulo', () => {
    // Projeção de teste: 1 unidade da grelha = 10 px, origem do esquema no píxel (100, 100).
    const toScreen = (p: { x: number; y: number }) => ({ x: 100 + 10 * p.x, y: 100 - 10 * p.y })
    const list: Component[] = []
    for (const x of [-4, 0, 4, 8]) {
      list.push(createComponent('resistor', { x, y: 0 }, { existing: list }))
    }
    // R2 (x = 0 → 100 px) e R3 (x = 4 → 140 px) ficam dentro de 90…150 px; R1 e R4 ficam fora.
    const ids = idsInsideRect(list, { left: 90, top: 90, width: 60, height: 20 }, toScreen)
    expect(ids).toEqual([list[1]?.id, list[2]?.id])
  })
})
