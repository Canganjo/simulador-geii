import { describe, expect, it } from 'vitest'
import {
  chargeSpeed,
  currentColor,
  currentLevel,
  isOvercurrent,
  MAX_SPEED,
  MIN_SPEED,
} from './chargeMotion'

describe('corrente → velocidade das cargas', () => {
  it('zero (e abaixo de 1 µA) → paradas', () => {
    expect(chargeSpeed(0)).toBe(0)
    expect(chargeSpeed(5e-7)).toBe(0) // 0,5 µA: abaixo do limiar
    expect(chargeSpeed(-5e-7)).toBe(0)
    expect(chargeSpeed(Number.NaN)).toBe(0)
  })

  it('o sinal da corrente dá o sentido; os eletrões andam ao contrário', () => {
    expect(chargeSpeed(0.01)).toBeGreaterThan(0)
    expect(chargeSpeed(-0.01)).toBeLessThan(0)
    expect(chargeSpeed(0.01, { direction: 'electron' })).toBeCloseTo(-chargeSpeed(0.01), 12)
  })

  it('escala logarítmica: 1 mA → 3 décadas em 7 acima de 1 µA', () => {
    // nível = log10(1e-3 / 1e-6) / log10(10 / 1e-6) = 3 / 7
    // velocidade = 0,4 + (4 − 0,4) · 3/7 = 0,4 + 3,6 · 0,428571 = 1,942857 células/s
    expect(currentLevel(1e-3)).toBeCloseTo(3 / 7, 12)
    expect(chargeSpeed(1e-3)).toBeCloseTo(MIN_SPEED + (MAX_SPEED - MIN_SPEED) * (3 / 7), 12)
  })

  it('cresce com |I| e fica no limite máximo a partir de 10 A', () => {
    expect(chargeSpeed(1e-3)).toBeLessThan(chargeSpeed(1e-2))
    expect(chargeSpeed(1e-2)).toBeLessThan(chargeSpeed(1))
    expect(chargeSpeed(10)).toBeCloseTo(MAX_SPEED, 12)
    expect(chargeSpeed(1000)).toBeCloseTo(MAX_SPEED, 12)
    expect(chargeSpeed(-1000)).toBeCloseTo(-MAX_SPEED, 12)
  })

  it('1 mA e 10 A veem-se os dois a mexer: entre a velocidade mínima e a máxima', () => {
    expect(chargeSpeed(1e-3)).toBeGreaterThan(MIN_SPEED)
    expect(chargeSpeed(10)).toBeLessThanOrEqual(MAX_SPEED)
  })

  it('o cursor da velocidade multiplica tudo', () => {
    expect(chargeSpeed(1e-3, { scale: 2 })).toBeCloseTo(2 * chargeSpeed(1e-3), 12)
    expect(chargeSpeed(1e-3, { scale: 0 })).toBeCloseTo(0, 12)
  })
})

describe('cor do fio e curto-circuito', () => {
  it('cinzento sem corrente, amarelo com pouca, vermelho com 10 A ou mais', () => {
    expect(currentColor(0)).toBe('#94a3b8')
    expect(currentColor(1e-6)).toBe('#94a3b8') // exatamente no limiar: nível 0, conta como 0 A
    expect(currentColor(1.001e-6)).toBe('#facc15') // logo acima do limiar: amarelo
    expect(currentColor(10)).toBe('#ef4444')
    expect(currentColor(-10)).toBe('#ef4444') // a cor não depende do sentido
  })

  it('acima de 1 A o fio pisca', () => {
    expect(isOvercurrent(0.5)).toBe(false)
    expect(isOvercurrent(1.5)).toBe(true)
    expect(isOvercurrent(-1.5)).toBe(true)
    expect(isOvercurrent(0.2, 0.1)).toBe(true)
  })
})
