import { describe, expect, it } from 'vitest'
import type { SimulationIssue } from '../core/solver'
import { translate, type Language, type Translate } from './i18n'
import { issueText } from './issueText'

const tr =
  (language: Language): Translate =>
  (key, vars) =>
    translate(language, key, vars)

describe('issueText: mensagens do motor na língua escolhida', () => {
  it('terminal com nome traduzido (ânodo → anode)', () => {
    const issue: SimulationIssue = {
      severity: 'warning',
      code: 'loose-terminal',
      message: 'D1: o terminal ânodo não está ligado.',
      componentIds: ['d1'],
      params: { name: 'D1', terminal: 'anodo' },
    }
    expect(issueText(issue, tr('pt'), ',')).toBe('D1: o terminal ânodo não está ligado.')
    expect(issueText(issue, tr('en'), '.')).toBe('D1: terminal anode is not connected.')
  })

  it('curto-circuito por um interruptor (fr)', () => {
    const issue: SimulationIssue = {
      severity: 'error',
      code: 'source-short',
      message: '…',
      componentIds: ['v1'],
      params: { name: 'V1', via: 'switch' },
    }
    expect(issueText(issue, tr('fr'), ',')).toBe(
      'V1 est en court-circuit : le + et le − sont reliés par un interrupteur fermé.',
    )
  })

  it('LED em sobrecorrente: correntes com prefixo e o separador da língua', () => {
    // 0,0255 A = 25,5 mA; máx. 0,02 A = 20 mA
    const issue: SimulationIssue = {
      severity: 'warning',
      code: 'led-overcurrent',
      message: '…',
      componentIds: ['d1'],
      params: { name: 'D1', current: 0.0255, max: 0.02 },
    }
    expect(issueText(issue, tr('pt'), ',')).toBe(
      'D1: corrente de 25,5 mA acima da corrente máxima (20 mA) — o LED queimava.',
    )
    expect(issueText(issue, tr('en'), '.')).toContain('25.5 mA')
  })

  it('sem dados (params) → a mensagem do core, tal como veio', () => {
    const issue: SimulationIssue = {
      severity: 'error',
      code: 'no-ground',
      message: 'Falta o GND.',
      componentIds: [],
    }
    expect(issueText(issue, tr('en'), '.')).toBe('Falta o GND.')
  })
})
