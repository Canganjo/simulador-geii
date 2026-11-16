import type { Component, ComponentKind } from '../core/model'

/**
 * Modelos 3D (.glb, feitos no Blender pela Pessoa 3) — ver public/models/LEIAME.md.
 *
 * COMO FUNCIONA
 *   - Um tipo de componente só usa um modelo se estiver nesta lista (MODEL_FILES).
 *     Enquanto não houver modelo, aparece a CAIXA simples de sempre (nada se parte).
 *   - Se o ficheiro faltar ou estiver estragado, a cena também volta à caixa.
 *   - Os cliques continuam a ser na caixa (invisível quando há modelo): o modelo é só aspeto.
 *
 * PARA ACRESCENTAR UM MODELO
 *   1. Pôr o ficheiro em public/models/<tipo>.glb (ex.: public/models/resistor.glb).
 *   2. Acrescentar aqui a linha  resistor: 'resistor.glb',
 */
export const MODEL_FILES: Partial<Record<ComponentKind, string>> = {
  'dc-source': 'dc-source.glb',
  ground: 'ground.glb',
  resistor: 'resistor.glb',
  switch: 'switch.glb',
  led: 'led.glb',
  diode: 'diode.glb',
  lamp: 'lamp.glb',
  capacitor: 'capacitor.glb',
  inductor: 'inductor.glb',
  voltmeter: 'voltmeter.glb',
  ammeter: 'ammeter.glb',
}

/**
 * Endereço do modelo de um tipo, ou null se ainda não houver modelo.
 * `base` é a raiz do site (import.meta.env.BASE_URL): "/" em pnpm dev,
 * "/simulador-geii/" no GitHub Pages.
 */
export function modelUrl(
  kind: ComponentKind,
  base: string,
  files: Partial<Record<ComponentKind, string>> = MODEL_FILES,
): string | null {
  const file = files[kind]
  if (!file) return null
  const root = base.endsWith('/') ? base : `${base}/`
  return `${root}models/${file}`
}

/**
 * Modelos que mudam com o ESTADO do componente (além do modelo normal de MODEL_FILES).
 * O interruptor tem dois: fechado (switch.glb) e aberto (switch-open.glb), para se ver
 * na cena se deixa passar a corrente.
 */
export const STATE_MODEL_FILES: Partial<Record<ComponentKind, string>> = {
  switch: 'switch-open.glb',
}

/** Endereço do modelo de UM componente, conforme o seu estado (ex.: interruptor aberto). */
export function modelUrlFor(component: Component, base: string): string | null {
  if (component.kind === 'switch' && !component.params.closed) {
    return modelUrl('switch', base, STATE_MODEL_FILES)
  }
  return modelUrl(component.kind, base)
}

/**
 * Nome do material que se acende (LED, lâmpada, seleção): no Blender, o material da parte que
 * deve brilhar chama-se "luz" (ex.: a cabeça do LED, o vidro da lâmpada).
 * Aceita também "luz.001", "Luz"… (o Blender acrescenta números quando se copia um material).
 * "corpo-luz" acende-se E recebe a cor do componente (ex.: a cúpula do LED).
 */
export function isGlowMaterial(name: string): boolean {
  return /^(corpo-)?luz(\.\d+)?$/i.test(name.trim())
}

/**
 * Nome do material que fica com a COR do componente (ex.: a cor do LED escolhida no painel):
 * "corpo" (ou "corpo.001"…), e também "corpo-luz". Os outros materiais ficam como vieram do Blender.
 */
export function isBodyMaterial(name: string): boolean {
  return /^corpo(-luz)?(\.\d+)?$/i.test(name.trim())
}

/**
 * Nome do material do VISOR (ex.: o ecrã da fonte de bancada): "visor" (ou "visor.001"…).
 * A aplicação escreve lá um texto, ex.: a tensão da fonte "12.0 V".
 */
export function isDisplayMaterial(name: string): boolean {
  return /^visor(\.\d+)?$/i.test(name.trim())
}
