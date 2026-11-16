import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Component as ReactComponent, useLayoutEffect, useMemo, type ReactNode } from 'react'
import {
  CanvasTexture,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
  type Material,
  type Object3D,
} from 'three'
import { isBodyMaterial, isDisplayMaterial, isGlowMaterial } from './models3d'

/**
 * Modelo 3D (.glb) de um componente — só o ASPETO. Os cliques continuam na caixa invisível do
 * ComponentBox, por isso o modelo ignora o rato (raycast desligado).
 *
 * Materiais com nomes especiais (definidos no Blender, ver public/models/LEIAME.md):
 *   "luz"   → acende-se (LED/lâmpada a funcionar, componente selecionado) e pisca em sobrecorrente;
 *   "corpo" → recebe a cor do componente (ex.: a cor do LED escolhida no painel).
 *   "visor" → ecrã onde se escreve `display` (ex.: a tensão da fonte, "12.0 V").
 */

interface Props {
  url: string
  /** Cor do componente (aplicada ao material "corpo"). */
  color: string
  /** Cor e força da luz própria (aplicadas ao material "luz"). */
  emissive: string
  intensity: number
  blink: boolean
  /** Texto do visor (material "visor"), ex.: "12.0 V". */
  display?: string
  /** Etiqueta pequena ao lado do texto do visor (fonte: "CV" ou "CC" depois de Simular). */
  displayTag?: string
  /** Chamado quando o modelo já está na cena (a caixa pode ficar invisível). */
  onReady: (ready: boolean) => void
}

export function ComponentModel({
  url,
  color,
  emissive,
  intensity,
  blink,
  display,
  displayTag,
  onReady,
}: Props) {
  const { scene } = useGLTF(url)

  // Cada componente tem a sua cópia (com materiais próprios: um LED aceso não acende os outros).
  const root = useMemo(() => cloneWithOwnMaterials(scene), [scene])

  useLayoutEffect(() => {
    const { glow, body } = specialMaterials(root)
    for (const m of body) m.color.set(color)
    for (const m of glow) {
      m.emissive.set(emissive)
      m.emissiveIntensity = glowIntensity(m, intensity)
    }
  }, [root, color, emissive, intensity])

  // Visor (ex.: fonte de bancada): o texto é desenhado numa imagem e posto no ecrã, a brilhar.
  useLayoutEffect(() => {
    if (display === undefined) return
    const screens = displayMaterials(root)
    if (screens.length === 0) return
    const texture = displayTexture(display, displayTag)
    for (const m of screens) {
      m.map = texture
      m.emissiveMap = texture
      m.color.set('#ffffff')
      m.emissive.set('#ffffff')
      m.emissiveIntensity = 0.9
      m.needsUpdate = true
    }
    return () => texture.dispose()
  }, [root, display, displayTag])

  useLayoutEffect(() => {
    onReady(true)
    return () => onReady(false)
  }, [onReady])

  // LED em sobrecorrente: a luz pisca (2 vezes por segundo), como na caixa.
  useFrame(({ clock }) => {
    if (!blink) return
    const on = Math.floor(clock.elapsedTime * 4) % 2 === 0
    for (const m of specialMaterials(root).glow) {
      m.emissiveIntensity = on ? glowIntensity(m, intensity) : 0.1
    }
  })

  return <primitive object={root} />
}

/** Cópia do modelo com materiais próprios; o rato atravessa-o (os cliques são na caixa). */
function cloneWithOwnMaterials(scene: Object3D): Object3D {
  const copy = scene.clone(true)
  copy.traverse((object) => {
    if (!(object instanceof Mesh)) return
    object.raycast = () => undefined
    const list: Material[] = Array.isArray(object.material) ? object.material : [object.material]
    const cloned = list.map((m) => m.clone())
    object.material = Array.isArray(object.material) ? cloned : cloned[0]
  })
  return copy
}

/** Materiais "luz" e "corpo" do modelo (ver o cabeçalho deste ficheiro). */
function specialMaterials(root: Object3D): {
  glow: MeshStandardMaterial[]
  body: MeshStandardMaterial[]
} {
  const glow: MeshStandardMaterial[] = []
  const body: MeshStandardMaterial[] = []
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const list: unknown[] = Array.isArray(object.material) ? object.material : [object.material]
    for (const m of list) {
      if (!(m instanceof MeshStandardMaterial)) continue
      if (isGlowMaterial(m.name)) glow.push(m)
      if (isBodyMaterial(m.name)) body.push(m)
    }
  })
  return { glow, body }
}

/**
 * Brilho de um material que acende. A cúpula do LED ("corpo-luz") já tem a cor da luz: com o brilho
 * todo ficava quase branca; a meio, continua bem vermelha (a auréola faz o resto).
 */
function glowIntensity(material: MeshStandardMaterial, intensity: number): number {
  return isBodyMaterial(material.name) ? intensity * 0.45 : intensity
}

/** Materiais "visor" do modelo. */
function displayMaterials(root: Object3D): MeshStandardMaterial[] {
  const found: MeshStandardMaterial[] = []
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const list: unknown[] = Array.isArray(object.material) ? object.material : [object.material]
    for (const m of list) {
      if (m instanceof MeshStandardMaterial && isDisplayMaterial(m.name)) found.push(m)
    }
  })
  return found
}

/**
 * Imagem de um visor de cristais líquidos verde com o texto (ex.: "12.0 V") e, se houver, uma
 * etiqueta à direita ("CV" a verde, "CC" a âmbar — como os LED de modo de uma fonte de bancada).
 */
function displayTexture(text: string, tag?: string): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 160
  const g = canvas.getContext('2d')
  if (g) {
    g.fillStyle = '#06210f'
    g.fillRect(0, 0, canvas.width, canvas.height)
    g.fillStyle = '#5dff8f'
    g.shadowColor = '#5dff8f'
    g.shadowBlur = 18
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    if (tag) {
      g.font = 'bold 88px Consolas, "Courier New", monospace'
      g.fillText(text, canvas.width * 0.4, canvas.height / 2 + 4)
      const color = tag === 'CC' ? '#fbbf24' : '#5dff8f'
      g.fillStyle = color
      g.shadowColor = color
      g.font = 'bold 60px Consolas, "Courier New", monospace'
      g.fillText(tag, canvas.width * 0.87, canvas.height / 2 + 4)
    } else {
      g.font = 'bold 104px Consolas, "Courier New", monospace'
      g.fillText(text, canvas.width / 2, canvas.height / 2 + 4)
    }
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.flipY = false // as coordenadas UV do glTF já vêm com o eixo V para baixo
  texture.anisotropy = 4
  return texture
}

interface BoundaryProps {
  children: ReactNode
  /** Chamado se o ficheiro faltar ou estiver estragado. */
  onError: () => void
}

/** Se o .glb não carregar, não mostra nada (e o ComponentBox volta a mostrar a caixa). */
export class ModelErrorBoundary extends ReactComponent<BoundaryProps, { failed: boolean }> {
  override state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  override componentDidCatch(error: unknown) {
    console.warn('Modelo 3D não carregou; fica a caixa simples.', error)
    this.props.onError()
  }

  override render() {
    return this.state.failed ? null : this.props.children
  }
}
