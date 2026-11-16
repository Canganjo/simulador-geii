/// <reference types="node" />
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ComponentKind } from '../core/model'
import { isBodyMaterial, isGlowMaterial, MODEL_FILES, STATE_MODEL_FILES } from './models3d'

/**
 * Verifica os ficheiros .glb de public/models contra a ficha técnica (public/models/LEIAME.md).
 *
 * No .glb (glTF) o eixo Y aponta para CIMA: o Blender converte (x, y, z) → (x, z, −y).
 * Por isso, aqui: x = comprimento, y = altura, −z = o "Y do Blender" (para cima no ecrã).
 */

const MODELS_DIR = join(process.cwd(), 'public', 'models')
const MAX_BYTES = 200 * 1024
const MAX_TRIANGLES = 2000
const TOLERANCE = 0.05

interface Gltf {
  materials?: { name?: string }[]
  nodes?: { mesh?: number; translation?: number[]; rotation?: number[]; scale?: number[] }[]
  meshes?: { primitives: { attributes: { POSITION: number }; indices?: number }[] }[]
  accessors: { count: number; min?: number[]; max?: number[] }[]
}

/** Lê a parte JSON de um ficheiro .glb (cabeçalho de 12 bytes + 1.º bloco). */
function readGlb(file: string): Gltf {
  const data = readFileSync(join(MODELS_DIR, file))
  // Um ponteiro do Git LFS (texto) em vez do ficheiro verdadeiro → "git lfs pull".
  expect(data.toString('latin1', 0, 4), `${file} não é um .glb (falta git lfs pull?)`).toBe('glTF')
  const jsonLength = data.readUInt32LE(12)
  expect(data.readUInt32LE(16)).toBe(0x4e4f534a) // "JSON"
  return JSON.parse(data.toString('utf8', 20, 20 + jsonLength)) as Gltf
}

function bounds(gltf: Gltf): { min: number[]; max: number[] } {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const mesh of gltf.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      const accessor = gltf.accessors[primitive.attributes.POSITION]
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i] ?? Infinity, accessor?.min?.[i] ?? Infinity)
        max[i] = Math.max(max[i] ?? -Infinity, accessor?.max?.[i] ?? -Infinity)
      }
    }
  }
  return { min, max }
}

function triangles(gltf: Gltf): number {
  let total = 0
  for (const mesh of gltf.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      const index = primitive.indices ?? primitive.attributes.POSITION
      total += (gltf.accessors[index]?.count ?? 0) / 3
    }
  }
  return total
}

const entries = [...Object.entries(MODEL_FILES), ...Object.entries(STATE_MODEL_FILES)] as [
  ComponentKind,
  string,
][]

describe.each(entries)('modelo %s (%s)', (kind, file) => {
  const gltf = readGlb(file)
  const { min, max } = bounds(gltf)
  const [minX = 0, minY = 0, minZ = 0] = min
  const [maxX = 0, maxY = 0, maxZ = 0] = max

  it('cabe nos limites: ≤ 200 KB e ≤ 2 000 triângulos', () => {
    expect(statSync(join(MODELS_DIR, file)).size).toBeLessThanOrEqual(MAX_BYTES)
    expect(triangles(gltf)).toBeLessThanOrEqual(MAX_TRIANGLES)
  })

  it('origem no chão e transformações aplicadas (nada abaixo do chão)', () => {
    for (const node of gltf.nodes ?? []) {
      expect(node.translation ?? [0, 0, 0]).toEqual([0, 0, 0])
      expect(node.scale ?? [1, 1, 1]).toEqual([1, 1, 1])
    }
    expect(minY).toBeGreaterThanOrEqual(-1e-3)
  })

  if (kind === 'ground') {
    it('GND: símbolo em 1 × 1 × 0,5 e terminal em Y = +1 do Blender', () => {
      expect(Math.max(-minX, maxX)).toBeLessThanOrEqual(0.5 + TOLERANCE)
      expect(maxY).toBeLessThanOrEqual(0.5)
      expect(-minZ).toBeCloseTo(1, 1) // a pata chega ao terminal
      expect(maxZ).toBeLessThanOrEqual(0.5 + TOLERANCE)
    })
  } else {
    it('dipolo: patas acabam em X = −1 e X = +1; caixa ≤ 2 × 0,8 × 0,8', () => {
      expect(minX).toBeCloseTo(-1, 1)
      expect(maxX).toBeCloseTo(1, 1)
      expect(maxY).toBeLessThanOrEqual(0.8)
      expect(Math.max(-minZ, maxZ)).toBeLessThanOrEqual(0.4)
    })
  }

  it('materiais: os que acendem e os que recebem a cor', () => {
    const names = (gltf.materials ?? []).map((m) => m.name ?? '')
    if (kind === 'led') {
      expect(names.some(isGlowMaterial)).toBe(true)
      expect(names.some(isBodyMaterial)).toBe(true) // a cor do LED escolhida no painel
    }
    if (kind === 'lamp') expect(names.some(isGlowMaterial)).toBe(true)
  })
})
