import { describe, expect, it } from 'vitest'
import {
  isHorizontal,
  moveSegment,
  segmentMiddles,
  wireCorners,
  simplifyRoute,
  waypointsOf,
  wireRoute,
} from './wireRoute'

const p = (x: number, y: number) => ({ x, y })

describe('simplifyRoute', () => {
  it('tira pontos repetidos e pontos no meio de uma reta', () => {
    expect(simplifyRoute([p(0, 0), p(0, 0), p(1, 0), p(3, 0), p(3, 2)])).toEqual([
      p(0, 0),
      p(3, 0),
      p(3, 2),
    ])
  })

  it('tira o "vai e volta" (o fio passa duas vezes no mesmo sítio)', () => {
    // 0,0 → 4,0 → 2,0 é o mesmo que 0,0 → 2,0
    expect(simplifyRoute([p(0, 0), p(4, 0), p(2, 0), p(2, 3)])).toEqual([p(0, 0), p(2, 0), p(2, 3)])
  })

  it('um fio de comprimento 0 fica com as duas pontas', () => {
    expect(simplifyRoute([p(1, 1), p(1, 1)])).toEqual([p(1, 1), p(1, 1)])
  })
})

describe('wireRoute', () => {
  it('sem cantos guardados → o "L" automático de sempre', () => {
    expect(wireRoute(p(0, 0), p(4, 2))).toEqual([p(0, 0), p(4, 0), p(4, 2)])
    expect(wireRoute(p(0, 0), p(4, 2), [])).toEqual([p(0, 0), p(4, 0), p(4, 2)])
  })

  it('com cantos → passa por eles, sempre na horizontal/vertical', () => {
    // a (0,0) → cantos (0,2) e (4,2) → b (4,0): um "U" virado para baixo
    expect(wireRoute(p(0, 0), p(4, 0), [p(0, 2), p(4, 2)])).toEqual([
      p(0, 0),
      p(0, 2),
      p(4, 2),
      p(4, 0),
    ])
  })

  it('se o componente mexeu, a ponta reajusta-se com um "L" até ao 1.º canto', () => {
    // a passou de (0,0) para (1,0): (1,0) → (0,0) → (0,2) …
    expect(wireRoute(p(1, 0), p(4, 0), [p(0, 2), p(4, 2)])).toEqual([
      p(1, 0),
      p(0, 0),
      p(0, 2),
      p(4, 2),
      p(4, 0),
    ])
  })
})

describe('moveSegment', () => {
  it('fio reto entre dois terminais, arrastado 2 para cima → "U" com os terminais no sítio', () => {
    const route = moveSegment([p(0, 0), p(4, 0)], 0, 2)
    expect(route).toEqual([p(0, 0), p(0, 2), p(4, 2), p(4, 0)])
  })

  it('troço vertical do meio de um "U", arrastado 3 para a direita', () => {
    // (0,0) → (0,2) → (4,2) → (4,0): o troço 1 é horizontal; o 2 é vertical (4,2)→(4,0)
    const u = [p(0, 0), p(0, 2), p(4, 2), p(4, 0)]
    expect(isHorizontal(u, 1)).toBe(true)
    expect(isHorizontal(u, 2)).toBe(false)
    // O troço 2 toca no terminal b (4,0): cria-se um troço novo de (4,0) até (7,0).
    expect(moveSegment(u, 2, 3)).toEqual([p(0, 0), p(0, 2), p(7, 2), p(7, 0), p(4, 0)])
  })

  it('troço do meio (sem terminais) mexe só os dois cantos', () => {
    const u = [p(0, 0), p(0, 2), p(4, 2), p(4, 0)]
    expect(moveSegment(u, 1, -1)).toEqual([p(0, 0), p(0, 1), p(4, 1), p(4, 0)])
  })

  it('voltar ao sítio de partida limpa os cantos que deixaram de ser precisos', () => {
    const up = moveSegment([p(0, 0), p(4, 0)], 0, 2) // "U"
    expect(moveSegment(up, 1, -2)).toEqual([p(0, 0), p(4, 0)])
  })

  it('arrastar 0 ou um troço que não existe não muda nada', () => {
    const l = [p(0, 0), p(4, 0), p(4, 2)]
    expect(moveSegment(l, 0, 0)).toEqual(l)
    expect(moveSegment(l, 5, 2)).toEqual(l)
  })
})

describe('waypointsOf e segmentMiddles', () => {
  it('os cantos são o traçado sem os dois terminais', () => {
    expect(waypointsOf([p(0, 0), p(0, 2), p(4, 2), p(4, 0)])).toEqual([p(0, 2), p(4, 2)])
    expect(waypointsOf([p(0, 0), p(4, 0)])).toEqual([])
  })

  it('o meio de cada troço (para as pegas)', () => {
    expect(segmentMiddles([p(0, 0), p(4, 0), p(4, 2)])).toEqual([p(2, 0), p(4, 1)])
  })

  it('guardar os cantos e voltar a calcular dá o mesmo traçado', () => {
    const route = moveSegment([p(0, 0), p(4, 0)], 0, 2)
    expect(wireRoute(p(0, 0), p(4, 0), waypointsOf(route))).toEqual(route)
  })
})

describe('wireCorners', () => {
  it('só os pontos do meio (onde o fio dobra) recebem junta; um fio reto não tem nenhuma', () => {
    expect(
      wireCorners([
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 3 },
        { x: 5, y: 3 },
      ]),
    ).toEqual([
      { x: 2, y: 0 },
      { x: 2, y: 3 },
    ])
    expect(
      wireCorners([
        { x: 0, y: 0 },
        { x: 4, y: 0 },
      ]),
    ).toEqual([])
  })
})
