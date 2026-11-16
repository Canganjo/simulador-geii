import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Component as ReactComponent, useLayoutEffect, useMemo, type ReactNode } from 'react'
import { Mesh, MeshStandardMaterial, type Material, type Object3D } from 'three'
import { isBodyMaterial, isGlowMaterial } from './models3d'

/**
 * Modelo 3D (.glb) de um componente — só o ASPETO. Os cliques continuam na caixa invisível do
 * ComponentBox, por isso o modelo ignora o rato (raycast desligado).
 *
 * Materiais com nomes especiais (definidos no Blender, ver public/models/LEIAME.md):
 *   "luz"   → acende-se (LED/lâmpada a funcionar, componente selecionado) e pisca em sobrecorrente;
 *   "corpo" → recebe a cor do componente (ex.: a cor do LED escolhida no painel).
 */

interface Props {
  url: string
  /** Cor do componente (aplicada ao material "corpo"). */
  color: string
  /** Cor e força da luz própria (aplicadas ao material "luz"). */
  emissive: string
  intensity: number
  blink: boolean
  /** Chamado quando o modelo já está na cena (a caixa pode ficar invisível). */
  onReady: (ready: boolean) => void
}

export function ComponentModel({ url, color, emissive, intensity, blink, onReady }: Props) {
  const { scene } = useGLTF(url)

  // Cada componente tem a sua cópia (com materiais próprios: um LED aceso não acende os outros).
  const root = useMemo(() => cloneWithOwnMaterials(scene), [scene])

  useLayoutEffect(() => {
    const { glow, body } = specialMaterials(root)
    for (const m of body) m.color.set(color)
    for (const m of glow) {
      m.emissive.set(emissive)
      m.emissiveIntensity = intensity
    }
  }, [root, color, emissive, intensity])

  useLayoutEffect(() => {
    onReady(true)
    return () => onReady(false)
  }, [onReady])

  // LED em sobrecorrente: a luz pisca (2 vezes por segundo), como na caixa.
  useFrame(({ clock }) => {
    if (!blink) return
    const on = Math.floor(clock.elapsedTime * 4) % 2 === 0
    for (const m of specialMaterials(root).glow) m.emissiveIntensity = on ? intensity : 0.1
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
