import { describe, expect, it } from 'vitest'
import { createComponent } from '../core/library'
import type { Component, Project, Wire } from '../core/model'
import {
  parseProjectFile,
  projectFileName,
  projectNameFromFile,
  toProjectFile,
} from './projectFile'

/** Projeto de teste: V1 (12 V) e R1 (470 Ω) ligados por dois fios. */
function sample(): Project {
  let n = 0
  const newId = () => `c${++n}`
  const v = createComponent('dc-source', { x: -4, y: 0 }, { newId })
  const r = createComponent('resistor', { x: 0, y: 0 }, { existing: [v], newId, rotation: 90 })
  const resistor: Component = { ...r, params: { ...r.params, resistance: 470 } }
  const wires: Wire[] = [
    { id: 'w1', from: 'c1:+', to: 'c2:a' },
    { id: 'w2', from: 'c2:b', to: 'c1:-' },
  ]
  return {
    version: 1,
    name: 'Divisor',
    components: [v, resistor],
    wires,
    createdAt: '2026-11-13T10:00:00.000Z',
    updatedAt: '2026-11-13T10:05:00.000Z',
  }
}

/** O texto de um projeto com uma alteração (para fazer ficheiros "estragados"). */
function mutated(change: (data: Record<string, unknown>) => void): string {
  const data = JSON.parse(toProjectFile(sample())) as Record<string, unknown>
  change(data)
  return JSON.stringify(data)
}

describe('guardar e abrir', () => {
  it('ida e volta: abrir o que se guardou dá exatamente o mesmo projeto', () => {
    const project = sample()
    const result = parseProjectFile(toProjectFile(project))
    expect(result).toEqual({ ok: true, project })
  })

  it('o ficheiro é JSON legível com a versão no topo', () => {
    const text = toProjectFile(sample())
    expect(text.startsWith('{\n  "version": 1,')).toBe(true)
  })

  it('os terminais são refeitos a partir do catálogo (mesmo que faltem no ficheiro)', () => {
    const text = mutated((d) => {
      for (const c of d.components as Record<string, unknown>[]) delete c.terminals
    })
    const result = parseProjectFile(text)
    if (!result.ok) throw new Error('devia abrir')
    expect(result.project.components[0]?.terminals.map((t) => t.id)).toEqual(['c1:+', 'c1:-'])
  })
})

describe('etiquetas móveis', () => {
  it('a posição da etiqueta guarda-se e abre-se igual; ficheiros antigos abrem sem ela', () => {
    const project = sample()
    const [v, r] = project.components
    if (!v || !r) throw new Error('amostra incompleta')
    const moved: Project = { ...project, components: [v, { ...r, labelOffset: { x: 1, y: -0.5 } }] }
    expect(parseProjectFile(toProjectFile(moved))).toEqual({ ok: true, project: moved })
    const old = parseProjectFile(toProjectFile(project))
    if (!old.ok) throw new Error('devia abrir')
    expect(old.project.components[1]).not.toHaveProperty('labelOffset')
  })
})

describe('fonte DC com limite de corrente (D-013)', () => {
  it('ficheiro antigo sem currentLimit → abre com o limite por defeito (3 A)', () => {
    const text = mutated((d) => {
      const source = (d.components as { params: Record<string, unknown> }[])[0]
      if (source) delete source.params.currentLimit
    })
    const result = parseProjectFile(text)
    if (!result.ok) throw new Error('devia abrir')
    expect(result.project.components[0]?.params).toEqual({ voltage: 12, currentLimit: 3 })
  })

  it('limite fora dos limites (0 A) → recusado', () => {
    const text = mutated((d) => {
      const source = (d.components as { params: Record<string, unknown> }[])[0]
      if (source) source.params.currentLimit = 0
    })
    expect(parseProjectFile(text).ok).toBe(false)
  })
})

describe('díodo real (E10)', () => {
  it('um projeto com um díodo guarda-se e abre-se igual (Is e n incluídos)', () => {
    const project = sample()
    const d = createComponent('diode', { x: 4, y: 0 }, { existing: project.components })
    project.components.push(d)
    const result = parseProjectFile(toProjectFile(project))
    expect(result).toEqual({ ok: true, project })
    expect(d.params).toEqual({ saturationCurrent: 2.52e-9, emissionCoefficient: 1.752 })
  })
})

describe('condensador e bobina (E10)', () => {
  it('guardam-se e abrem-se iguais (C, L e valores iniciais incluídos)', () => {
    const project = sample()
    const c = createComponent('capacitor', { x: 4, y: 0 }, { existing: project.components })
    const capacitor: Component = { ...c, params: { capacitance: 47e-6, initialVoltage: 2.5 } }
    project.components.push(capacitor)
    const l = createComponent('inductor', { x: 8, y: 0 }, { existing: project.components })
    project.components.push(l)
    expect(parseProjectFile(toProjectFile(project))).toEqual({ ok: true, project })
    expect(l.params).toEqual({ inductance: 10e-3, initialCurrent: 0 })
    expect([capacitor.name, l.name]).toEqual(['C1', 'L1'])
  })
})

describe('ficheiros recusados', () => {
  it('não é JSON', () => {
    expect(parseProjectFile('isto não é JSON')).toEqual({ ok: false, error: { code: 'not-json' } })
  })

  it('versão mais recente do que esta app', () => {
    const result = parseProjectFile(mutated((d) => (d.version = 2)))
    expect(result).toEqual({ ok: false, error: { code: 'newer-version', version: 2 } })
  })

  it.each([
    ['sem versão', (d: Record<string, unknown>) => delete d.version],
    [
      'tipo de componente desconhecido',
      (d: Record<string, unknown>) => {
        ;(d.components as Record<string, unknown>[])[0]!.kind = 'transistor'
      },
    ],
    [
      'rotação de 45°',
      (d: Record<string, unknown>) => {
        ;(d.components as Record<string, unknown>[])[0]!.rotation = 45
      },
    ],
    [
      'resistência de 0 Ω (fora dos limites)',
      (d: Record<string, unknown>) => {
        ;(d.components as { params: Record<string, unknown> }[])[1]!.params.resistance = 0
      },
    ],
    [
      'fio para um terminal que não existe',
      (d: Record<string, unknown>) => {
        ;(d.wires as Record<string, unknown>[])[0]!.to = 'c9:a'
      },
    ],
    [
      'dois componentes com o mesmo ID',
      (d: Record<string, unknown>) => {
        ;(d.components as Record<string, unknown>[])[1]!.id = 'c1'
      },
    ],
  ])('%s → invalid', (_, change) => {
    const result = parseProjectFile(mutated(change))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('invalid')
  })
})

describe('projectFileName', () => {
  it.each([
    ['Divisor 12V', 'divisor-12v.geii.json'],
    ['Montagem nº 3 — LED', 'montagem-n-3-led.geii.json'],
    ['!!!', 'circuito.geii.json'],
  ])('"%s" → %s', (name, expected) => {
    expect(projectFileName(name)).toBe(expected)
  })
})

describe('projectNameFromFile', () => {
  it('tira a extensão .geii.json ou .json (o resto fica como o utilizador escreveu)', () => {
    expect(projectNameFromFile('divisor 12V.geii.json')).toBe('divisor 12V')
    expect(projectNameFromFile('Teste.JSON')).toBe('Teste')
    expect(projectNameFromFile('.geii.json')).toBe('circuito')
  })
})
