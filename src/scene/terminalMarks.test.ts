import { describe, expect, it } from 'vitest'
import { terminalHighlight, terminalMark, wireCounts } from './terminalMarks'

describe('wireCounts', () => {
  it('conta os fios que chegam a cada terminal', () => {
    // V1:+ → R1:a, R1:a → R2:a, R2:b → V1:-: R1:a recebe 2 fios, os outros 1.
    const counts = wireCounts([
      { from: 'v1:+', to: 'r1:a' },
      { from: 'r1:a', to: 'r2:a' },
      { from: 'r2:b', to: 'v1:-' },
    ])
    expect(counts.get('r1:a')).toBe(2)
    expect(counts.get('v1:+')).toBe(1)
    expect(counts.get('r2:b')).toBe(1)
    expect(counts.get('r1:b')).toBeUndefined()
  })

  it('sem fios: mapa vazio', () => {
    expect(wireCounts([]).size).toBe(0)
  })
})

describe('terminalMark', () => {
  it('0 fios = quadrado aberto, 1 = ligado, 2 ou mais = ponto de junção', () => {
    expect(terminalMark(0)).toBe('open')
    expect(terminalMark(1)).toBe('joined')
    expect(terminalMark(2)).toBe('junction')
    expect(terminalMark(5)).toBe('junction')
  })
})

describe('terminalHighlight', () => {
  it('sem fio a desenhar: só o rato realça', () => {
    expect(terminalHighlight('r1:a', false, null)).toBe('none')
    expect(terminalHighlight('r1:a', true, null)).toBe('hover')
  })

  it('a desenhar um fio: a origem fica marcada e os outros são alvos', () => {
    expect(terminalHighlight('r1:a', false, 'r1:a')).toBe('origin')
    expect(terminalHighlight('r1:a', true, 'r1:a')).toBe('origin')
    expect(terminalHighlight('r2:a', false, 'r1:a')).toBe('target')
    expect(terminalHighlight('r2:a', true, 'r1:a')).toBe('hover')
  })
})
