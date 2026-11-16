import { describe, expect, it } from 'vitest'
import { ratedPowerLabel, ratedPowerOptions, RATED_POWERS } from './ratedPower'

describe('potência nominal da resistência', () => {
  it('série comercial 1/8, 1/4, 1/2, 1 e 2 W', () => {
    expect([...RATED_POWERS]).toEqual([0.125, 0.25, 0.5, 1, 2])
    expect(RATED_POWERS.map((w) => ratedPowerLabel(w, ','))).toEqual([
      '1/8 W',
      '1/4 W',
      '1/2 W',
      '1 W',
      '2 W',
    ])
  })

  it('um valor fora da série (ficheiro antigo) não se perde: entra na lista, por ordem', () => {
    expect(ratedPowerOptions(0.25)).toEqual([0.125, 0.25, 0.5, 1, 2])
    expect(ratedPowerOptions(5)).toEqual([0.125, 0.25, 0.5, 1, 2, 5])
    expect(ratedPowerOptions(0.3)).toEqual([0.125, 0.25, 0.3, 0.5, 1, 2])
    expect(ratedPowerLabel(0.3, ',')).toBe('0,3 W')
  })
})
