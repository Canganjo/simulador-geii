import type { ComponentKind } from '../core/model'

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
