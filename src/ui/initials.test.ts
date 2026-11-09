import { describe, expect, it } from 'vitest'
import { initials, username } from './initials'

describe('initials', () => {
  it.each([
    ['Ana Maria Silva', 'AS'], // primeira letra do primeiro e do último nome
    ['canganjo clemente', 'CC'],
    ['Canganjo', 'CA'], // um só nome → duas primeiras letras
    ['  Élio   Costa  ', 'ÉC'], // espaços a mais e acentos
    ['', '?'],
    ['   ', '?'],
  ])('%j → %s', (name, expected) => {
    expect(initials(name)).toBe(expected)
  })
})

describe('username', () => {
  it.each([
    ['Canganjo Clemente', 'Canganjo'], // primeiro nome
    ['Élio Costa', 'Elio'], // sem acentos
    ['  ', 'convidado'],
  ])('%j → @%s', (name, expected) => {
    expect(username(name)).toBe(expected)
  })
})
