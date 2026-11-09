import { describe, expect, it } from 'vitest'
import type { Component, ComponentKind } from '../model'
import { CATALOG, COMPONENT_CATEGORIES, catalogByCategory, type ParamSpec } from './catalog'
import { createComponent, nextName } from './createComponent'
import { validateParams } from './validateParams'

const ALL_KINDS = Object.keys(CATALOG) as ComponentKind[]

/** Gerador de IDs previsível para os testes: c1, c2, c3… */
function sequentialIds() {
  let n = 0
  return () => `c${++n}`
}

describe('catálogo', () => {
  it('tem os 6 componentes do MVP', () => {
    expect([...ALL_KINDS].sort()).toEqual(
      ['dc-source', 'ground', 'lamp', 'led', 'resistor', 'switch'].sort(),
    )
  })

  it('cada entrada tem o kind igual à sua chave e uma categoria válida', () => {
    for (const [key, def] of Object.entries(CATALOG)) {
      expect(def.kind).toBe(key)
      expect(COMPONENT_CATEGORIES).toContain(def.category)
    }
  })

  it('nomes de base: V, GND, R, S, D, L (todos diferentes)', () => {
    expect(CATALOG['dc-source'].namePrefix).toBe('V')
    expect(CATALOG.ground.namePrefix).toBe('GND')
    expect(CATALOG.resistor.namePrefix).toBe('R')
    expect(CATALOG.switch.namePrefix).toBe('S')
    expect(CATALOG.led.namePrefix).toBe('D')
    expect(CATALOG.lamp.namePrefix).toBe('L')
    const prefixes = Object.values(CATALOG).map((d) => d.namePrefix)
    expect(new Set(prefixes).size).toBe(prefixes.length)
  })

  it.each([
    ['dc-source', ['+', '−']],
    ['ground', ['GND']],
    ['resistor', ['a', 'b']],
    ['switch', ['a', 'b']],
    ['led', ['ânodo', 'cátodo']],
    ['lamp', ['a', 'b']],
  ] as const)('%s mostra os terminais %j', (kind, labels) => {
    expect(CATALOG[kind].terminals.map((t) => t.label)).toEqual(labels)
  })

  it('cada parâmetro por defeito tem uma descrição, e vice-versa', () => {
    for (const def of Object.values(CATALOG)) {
      expect(Object.keys(def.params).sort(), def.kind).toEqual(
        Object.keys(def.defaultParams).sort(),
      )
    }
  })

  it('os parâmetros numéricos têm unidade SI e limites coerentes (min ≤ max)', () => {
    for (const def of Object.values(CATALOG)) {
      const specs: Record<string, ParamSpec> = def.params
      for (const [param, spec] of Object.entries(specs)) {
        if (spec.type !== 'number') continue
        expect(['V', 'A', 'Ω', 'W'], `${def.kind}.${param}`).toContain(spec.unit)
        expect(spec.min, `${def.kind}.${param}`).toBeLessThanOrEqual(spec.max)
      }
    }
  })

  it('todos os valores por defeito são válidos (dentro dos limites)', () => {
    for (const def of Object.values(CATALOG)) {
      expect(validateParams(def.kind, def.defaultParams), def.kind).toEqual([])
    }
  })

  it('valores por defeito coerentes com a planilha (testes de referência)', () => {
    expect(CATALOG['dc-source'].defaultParams.voltage).toBe(12) // 12 V
    expect(CATALOG.resistor.defaultParams.resistance).toBe(1000) // 1 kΩ
    expect(CATALOG.led.defaultParams).toMatchObject({
      forwardVoltage: 2, // Vf = 2 V
      maxCurrent: 0.02, // 20 mA
      seriesResistance: 0, // 0 Ω (o teste 6 não tem resistência série)
    })
    expect(CATALOG.lamp.defaultParams).toEqual({ ratedVoltage: 12, ratedPower: 1 }) // 12 V / 1 W
  })

  it('teste 6 da planilha com o LED por defeito: (12 − 2) / 470 = 21,28 mA (tol. 0,1 %)', () => {
    // Fonte 12 V + R = 470 Ω + LED (Vf = 2 V, Rs = 0 Ω):
    // I = (E − Vf) / (R + Rs) = (12 − 2) / (470 + 0) = 10 / 470 = 0,021277 A
    const E = CATALOG['dc-source'].defaultParams.voltage
    const { forwardVoltage, seriesResistance } = CATALOG.led.defaultParams
    const current = (E - forwardVoltage) / (470 + seriesResistance)
    expect(Math.abs(current - 0.0212766) / 0.0212766).toBeLessThan(0.001)
  })

  it('a lâmpada 12 V / 1 W equivale a 144 Ω (R = U² / P = 144 / 1)', () => {
    const { ratedVoltage, ratedPower } = CATALOG.lamp.defaultParams
    expect(ratedVoltage ** 2 / ratedPower).toBeCloseTo(144, 9)
  })

  it('catalogByCategory segue a ordem do menu e inclui todos os tipos', () => {
    const groups = catalogByCategory()
    expect(groups.map((g) => g.category)).toEqual([...COMPONENT_CATEGORIES])
    expect(groups.flatMap((g) => g.items.map((i) => i.kind)).sort()).toEqual([...ALL_KINDS].sort())
  })
})

describe('createComponent', () => {
  it('dois createComponent("resistor") → R1 e R2 com IDs diferentes', () => {
    const r1 = createComponent('resistor', { x: 0, y: 0 })
    const r2 = createComponent('resistor', { x: 2, y: 0 }, { existing: [r1] })
    expect(r1.name).toBe('R1')
    expect(r2.name).toBe('R2')
    expect(r1.id).not.toBe(r2.id)
  })

  it.each([
    ['dc-source', ['+', '-']],
    ['ground', ['gnd']],
    ['resistor', ['a', 'b']],
    ['switch', ['a', 'b']],
    ['led', ['anodo', 'catodo']],
    ['lamp', ['a', 'b']],
  ] as const)('%s tem os terminais %j', (kind, names) => {
    const c = createComponent(kind, { x: 0, y: 0 }, { newId: () => 'c9' })
    expect(c.terminals.map((t) => t.name)).toEqual(names)
    for (const t of c.terminals) {
      expect(t.id).toBe(`c9:${t.name}`) // o fio guarda este ID
      expect(t.componentId).toBe('c9')
    }
  })

  it('cada instância tem uma cópia própria dos parâmetros', () => {
    const r1 = createComponent('resistor', { x: 0, y: 0 })
    r1.params.resistance = 220
    const r2 = createComponent('resistor', { x: 0, y: 0 }, { existing: [r1] })
    expect(r2.params.resistance).toBe(1000)
    expect(CATALOG.resistor.defaultParams.resistance).toBe(1000)
  })

  it('guarda a posição e a rotação (0° por defeito)', () => {
    const pos = { x: 3, y: -2 }
    const a = createComponent('lamp', pos)
    const b = createComponent('lamp', pos, { rotation: 90 })
    expect(a.position).toEqual({ x: 3, y: -2 })
    expect(a.position).not.toBe(pos) // cópia, não a mesma referência
    expect(a.rotation).toBe(0)
    expect(b.rotation).toBe(90)
  })

  it('a numeração é por tipo: R1, V1, R2, L1', () => {
    const newId = sequentialIds()
    const list: Component[] = []
    for (const kind of ['resistor', 'dc-source', 'resistor', 'lamp'] as const) {
      list.push(createComponent(kind, { x: 0, y: 0 }, { existing: list, newId }))
    }
    expect(list.map((c) => c.name)).toEqual(['R1', 'V1', 'R2', 'L1'])
    expect(list.map((c) => c.id)).toEqual(['c1', 'c2', 'c3', 'c4'])
  })
})

describe('nextName', () => {
  it('usa o maior número + 1 (não reaproveita buracos)', () => {
    expect(nextName('R', [{ name: 'R1' }, { name: 'R3' }])).toBe('R4')
  })

  it('ignora nomes de outros prefixos e nomes mudados à mão', () => {
    expect(nextName('R', [{ name: 'RX' }, { name: 'L7' }, { name: 'Resistor' }])).toBe('R1')
  })

  it('"L" e "LED1" não se confundem', () => {
    expect(nextName('L', [{ name: 'LED5' }, { name: 'L2' }])).toBe('L3')
  })
})

describe('validateParams', () => {
  it('rejeita uma resistência de 0 Ω com uma mensagem clara', () => {
    const issues = validateParams('resistor', { resistance: 0 }, 'R1')
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ param: 'resistance', reason: 'out-of-range' })
    expect(issues[0]?.message).toContain('R1')
    expect(issues[0]?.message).toContain('0 Ω')
  })

  it.each([
    ['negativa', -5, 'out-of-range'],
    ['acima do máximo', 1e9, 'out-of-range'],
    ['NaN', Number.NaN, 'not-finite'],
    ['infinita', Number.POSITIVE_INFINITY, 'not-finite'],
    ['texto', '1k', 'wrong-type'],
  ] as const)('rejeita uma resistência %s', (_label, value, reason) => {
    expect(validateParams('resistor', { resistance: value })).toEqual([
      expect.objectContaining({ param: 'resistance', reason }),
    ])
  })

  it('aceita os limites exatos (inclusive)', () => {
    expect(validateParams('resistor', { resistance: 1e-3 })).toEqual([])
    expect(validateParams('resistor', { resistance: 1e8 })).toEqual([])
  })

  it('a potência nominal da resistência é opcional; os outros parâmetros não', () => {
    expect(validateParams('resistor', { resistance: 470 })).toEqual([])
    expect(validateParams('dc-source', {})).toEqual([
      expect.objectContaining({ param: 'voltage', reason: 'missing' }),
    ])
  })

  it('verifica booleanos e opções', () => {
    expect(validateParams('switch', { closed: 'sim' })).toEqual([
      expect.objectContaining({ param: 'closed', reason: 'wrong-type' }),
    ])
    expect(validateParams('led', { ...CATALOG.led.defaultParams, color: 'roxo' })).toEqual([
      expect.objectContaining({ param: 'color', reason: 'invalid-option' }),
    ])
  })

  it('o GND não tem parâmetros', () => {
    expect(validateParams('ground', {})).toEqual([])
  })
})
