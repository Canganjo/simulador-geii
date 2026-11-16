import { describe, expect, it } from 'vitest'
import { createComponent } from '../core/library'
import type { Component } from '../core/model'
import type { ComponentResult } from '../core/solver'
import { translate } from './i18n'
import { csvFileName, csvFormat, csvNumber, dcResultsCsv, transientCsv } from './exportCsv'

const pt = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) =>
  translate('pt', key, vars)
const en = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) =>
  translate('en', key, vars)

/**
 * Divisor de tensão (testes de referência 1, 2 e 5 da planilha), calculado à mão:
 *   V1 = 12 V, R1 = 1 kΩ, R2 = 2 kΩ em série
 *   I = 12 / (1000 + 2000) = 0,004 A
 *   U_R1 = 1000 × 0,004 = 4 V   P_R1 = 4 × 0,004 = 0,016 W
 *   U_R2 = 2000 × 0,004 = 8 V   P_R2 = 8 × 0,004 = 0,032 W
 *   Fonte: U = 12 V, I = 0,004 A, P = −12 × 0,004 = −0,048 W (fornece), modo CV (4 mA < 3 A)
 */
function divider() {
  let n = 0
  const newId = () => `c${++n}`
  const v1 = { ...createComponent('dc-source', { x: 0, y: 0 }, { newId }), name: 'V1' }
  const gnd = { ...createComponent('ground', { x: 0, y: 2 }, { newId }), name: 'GND1' }
  const r1 = { ...createComponent('resistor', { x: 2, y: 0 }, { newId }), name: 'R1' }
  const r2base = createComponent('resistor', { x: 4, y: 0 }, { newId })
  const r2 = { ...r2base, name: 'R2', params: { ...r2base.params, resistance: 2000 } }
  const components: Component[] = [v1, gnd, r1, r2]
  const results = new Map<string, ComponentResult>([
    [v1.id, { voltage: 12, current: 0.004, power: -0.048, sourceMode: 'cv' }],
    [r1.id, { voltage: 4, current: 0.004, power: 0.016 }],
    [r2.id, { voltage: 8, current: 0.004, power: 0.032 }],
  ])
  return { components, results, v1, r1, r2 }
}

describe('csvNumber', () => {
  it.each([
    [0.004, ',', '0,004'],
    [0.1 + 0.2, '.', '0.3'], // tira o ruído 0,30000000000000004
    [-0.048, ',', '-0,048'],
    [2.52e-9, ',', '2,52e-9'],
    [1000, ',', '1000'],
  ] as const)('%s → "%s"', (value, decimal, expected) => {
    expect(csvNumber(value, csvFormat(decimal))).toBe(expected)
  })

  it('um valor não finito fica vazio', () => {
    expect(csvNumber(Number.NaN, csvFormat(','))).toBe('')
  })
})

describe('dcResultsCsv (divisor 12 V, 1 kΩ + 2 kΩ)', () => {
  it('português: separador ";", vírgula decimal, valores SI, GND sem linha', () => {
    const { components, results } = divider()
    const csv = dcResultsCsv(components, results, pt, csvFormat(','))
    expect(csv.split('\r\n')).toEqual([
      'Componente;Tipo;U (V);I (A);R (Ω);P (W);Estado',
      'V1;Fonte DC;12;0,004;;-0,048;CV',
      'R1;Resistência;4;0,004;1000;0,016;',
      'R2;Resistência;8;0,004;2000;0,032;',
      '',
    ])
  })

  it('inglês: separador "," e ponto decimal', () => {
    const { components, results } = divider()
    const csv = dcResultsCsv(components, results, en, csvFormat('.'))
    expect(csv.split('\r\n')[2]).toBe('R1,Resistor,4,0.004,1000,0.016,')
  })

  it('um nome com o separador vai entre aspas', () => {
    const { components, results, r1 } = divider()
    const renamed = components.map((c) => (c.id === r1.id ? { ...c, name: 'R;a "x"' } : c))
    const csv = dcResultsCsv(renamed, results, pt, csvFormat(','))
    expect(csv).toContain('"R;a ""x""";Resistência;4;')
  })
})

describe('transientCsv', () => {
  it('uma linha por instante: t, depois u e i de cada componente', () => {
    // Valores à mão de um RC (τ = 0,1 s, 10 V): u_C(t) = 10 · (1 − e^(−t/τ))
    //   t = 0     → u = 0 V,      i = 10 / 1000 = 0,01 A
    //   t = 0,1 s → u = 6,32 V,   i = 0,01 · e^(−1) = 0,00368 A
    const { components, r1 } = divider()
    const csv = transientCsv(
      components,
      [0, 0.1],
      new Map([[r1.id, { voltage: [0, 6.32], current: [0.01, 0.00368], power: [0, 0] }]]),
      csvFormat(','),
    )
    expect(csv.split('\r\n')).toEqual([
      't (s);R1 u (V);R1 i (A)',
      '0;0;0,01',
      '0,1;6,32;0,00368',
      '',
    ])
  })
})

describe('csvFileName', () => {
  it('nome do projeto sem acentos nem espaços + "-resultados.csv"', () => {
    expect(csvFileName('Divisor de tensão')).toBe('divisor-de-tensao-resultados.csv')
    expect(csvFileName('')).toBe('circuito-resultados.csv')
  })
})
