import type { Component } from '../core/model'
import type { SimulationResult } from '../core/solver'

/**
 * Como um componente aparece na cena depois de Simular (etapa E7, "feedback").
 *
 * Função pura: recebe o componente e o resultado da simulação (ou null, se não há resultados)
 * e diz se brilha, com que cor e força, e se tem um erro ou aviso (contorno colorido).
 */
export interface VisualState {
  /** Força do brilho, de 0 (apagado) a 1 (máximo). */
  glow: number
  /** Cor do brilho (só quando glow > 0). */
  glowColor: string | null
  /** O pior problema que a simulação encontrou neste componente. */
  issue: 'error' | 'warning' | null
  /** LED acima da corrente máxima: pisca ("queimava"). */
  blink: boolean
  /** Só fontes DC depois de Simular: tensão de saída medida e modo (CV / CC), para o visor. */
  source: { voltage: number; mode: 'cv' | 'cc' } | null
  /** Só instrumentos depois de Simular: a leitura (V do voltímetro, A do amperímetro). */
  reading: number | null
}

export const NO_VISUAL: VisualState = {
  glow: 0,
  glowColor: null,
  issue: null,
  blink: false,
  source: null,
  reading: null,
}

/** Cor da luz de cada cor de LED (os valores guardados no projeto estão em português). */
export const LED_LIGHT: Readonly<Record<string, string>> = {
  vermelho: '#ef4444',
  verde: '#22c55e',
  azul: '#3b82f6',
  amarelo: '#facc15',
  branco: '#f8fafc',
}

/** Luz de uma lâmpada incandescente (amarelo quente). */
export const LAMP_LIGHT = '#fde047'

export function visualState(c: Component, result: SimulationResult | null): VisualState {
  if (result === null) return NO_VISUAL

  const mine = result.issues.filter((i) => i.componentIds.includes(c.id))
  const issue = mine.some((i) => i.severity === 'error')
    ? 'error'
    : mine.length > 0
      ? 'warning'
      : null
  const blink = mine.some((i) => i.code === 'led-overcurrent')

  const r = result.ok ? result.results.get(c.id) : undefined
  let glow = 0
  let glowColor: string | null = null
  if (r && c.kind === 'led' && r.ledState === 'on') {
    // O modelo simples do MVP só diz "aceso" ou "apagado": aceso = brilho máximo.
    glow = 1
    glowColor = LED_LIGHT[c.params.color] ?? LED_LIGHT.vermelho ?? null
  } else if (r && c.kind === 'lamp') {
    // Brilho = potência recebida / potência nominal (a 12 V numa lâmpada de 12 V: 1; a 6 V: ¼).
    glow = clamp01(r.power / c.params.ratedPower)
    glowColor = glow > 0 ? LAMP_LIGHT : null
  }

  const source =
    r && c.kind === 'dc-source' && r.sourceMode ? { voltage: r.voltage, mode: r.sourceMode } : null

  const reading =
    r && c.kind === 'voltmeter' ? r.voltage : r && c.kind === 'ammeter' ? r.current : null

  return { glow, glowColor, issue, blink, source, reading }
}

function clamp01(x: number): number {
  return Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0
}
