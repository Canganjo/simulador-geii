import { describe, expect, it } from 'vitest'
import { terminalHit } from './terminalPick'

const body = { object: { userData: {} } }
const pin = (id: string) => ({ object: { userData: { terminalId: id } } })

describe('prioridade dos pinos no clique', () => {
  it('o raio atravessa o corpo e depois um pino → ganha o pino', () => {
    expect(terminalHit([body, pin('R1:b')])).toBe('R1:b')
  })

  it('só o corpo (ou nada) → não há pino', () => {
    expect(terminalHit([body])).toBeNull()
    expect(terminalHit([])).toBeNull()
  })

  it('dois pinos no caminho → o mais perto da câmara (o primeiro)', () => {
    expect(terminalHit([body, pin('R1:a'), pin('R2:b')])).toBe('R1:a')
  })
})
