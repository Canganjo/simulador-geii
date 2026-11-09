import { describe, expect, it } from 'vitest'
import {
  findFreeCell,
  modelToScene,
  rotateOffset,
  sceneToModel,
  snapToGrid,
  terminalOffsets,
} from './coordinates'

describe('snapToGrid', () => {
  it('arredonda para o ponto da grelha mais próximo', () => {
    expect(snapToGrid({ x: 2.4, y: -0.6 })).toEqual({ x: 2, y: -1 })
    expect(snapToGrid({ x: 2.6, y: 3.49 })).toEqual({ x: 3, y: 3 })
  })

  it('um ponto já na grelha não muda', () => {
    expect(snapToGrid({ x: 5, y: -7 })).toEqual({ x: 5, y: -7 })
  })

  it('a meio caminho (0,5) vai para cima, como Math.round', () => {
    expect(snapToGrid({ x: 0.5, y: -0.5 })).toEqual({ x: 1, y: 0 })
  })

  it('o resultado é sempre inteiro e nunca −0', () => {
    const p = snapToGrid({ x: -0.3, y: -0.2 })
    expect(Object.is(p.x, 0) && Object.is(p.y, 0)).toBe(true)
    for (const v of [-3.7, -1.2, 0.01, 8.9]) {
      expect(Number.isInteger(snapToGrid({ x: v, y: v }).x)).toBe(true)
    }
  })
})

describe('modelo ↔ cena', () => {
  it('modelo (x, y) → cena (x, 0, −y)', () => {
    expect(modelToScene({ x: 3, y: 2 })).toEqual([3, 0, -2])
    expect(modelToScene({ x: -1, y: -4 }, 0.25)).toEqual([-1, 0.25, 4])
  })

  it('ida e volta dá o mesmo ponto', () => {
    const p = { x: 7, y: -3 }
    const [x, , z] = modelToScene(p)
    expect(sceneToModel(x, z)).toEqual(p)
  })
})

describe('terminais e rotação', () => {
  it('os dipolos têm terminais nas pontas, em pontos da grelha', () => {
    expect(terminalOffsets('resistor')).toEqual([
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ])
    expect(terminalOffsets('ground')).toEqual([{ x: 0, y: 1 }])
  })

  it('rodar 90° (anti-horário): (1, 0) → (0, 1) ; 180°: → (−1, 0) ; 270°: → (0, −1)', () => {
    expect(rotateOffset({ x: 1, y: 0 }, 90)).toEqual({ x: 0, y: 1 })
    expect(rotateOffset({ x: 1, y: 0 }, 180)).toEqual({ x: -1, y: 0 })
    expect(rotateOffset({ x: 1, y: 0 }, 270)).toEqual({ x: 0, y: -1 })
    expect(rotateOffset({ x: 2, y: 3 }, 0)).toEqual({ x: 2, y: 3 })
  })
})

describe('findFreeCell', () => {
  it('se o ponto está livre, usa-o (já ajustado à grelha)', () => {
    expect(findFreeCell({ x: 0.2, y: 0.1 }, [])).toEqual({ x: 0, y: 0 })
  })

  it('se está ocupado, procura outro ponto livre à volta', () => {
    const occupied = [{ x: 0, y: 0 }]
    const p = findFreeCell({ x: 0, y: 0 }, occupied)
    expect(p).not.toEqual({ x: 0, y: 0 })
    expect(Number.isInteger(p.x) && Number.isInteger(p.y)).toBe(true)
  })

  it('vários cliques seguidos dão posições todas diferentes', () => {
    const placed: { x: number; y: number }[] = []
    for (let i = 0; i < 12; i++) placed.push(findFreeCell({ x: 0, y: 0 }, placed))
    expect(new Set(placed.map((p) => `${p.x},${p.y}`)).size).toBe(12)
  })
})
