import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Box3 } from 'three'
import { GLTFLoader, MeshoptDecoder } from 'three-stdlib'
import { services } from '../data/services'

const bytes = readFileSync('src/assets/navigation-sculptures.glb')
const modelFile = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder()).parseAsync(
  new Uint8Array(bytes).buffer, '',
)

describe('Blender production asset', () => {
  it('keeps the original Blender model dimensions after compression', async () => {
    const raw = readFileSync('design/blender/navigation-sculptures.raw.glb')
    const original = await new GLTFLoader().parseAsync(new Uint8Array(raw).buffer, '')
    for (const root of modelFile.scene.children) {
      const before = new Box3().setFromObject(original.scene.getObjectByName(root.name))
      const after = new Box3().setFromObject(root)
      for (const axis of ['x', 'y', 'z']) {
        expect(Math.abs(before.min[axis] - after.min[axis]), root.name).toBeLessThan(.003)
        expect(Math.abs(before.max[axis] - after.max[axis]), root.name).toBeLessThan(.003)
      }
    }
  })

  it('contains a distinct, volumetric model for all 17 service slugs', () => {
    const roots = modelFile.scene.children
    expect(roots.map((node) => node.name).sort()).toEqual(services.map((service) => service.slug).sort())
    expect(roots.map((node) => node.name)).not.toContain('duya-note')
    for (const root of roots) {
      const box = new Box3().setFromObject(root)
      expect(box.max.z - box.min.z, root.name).toBeGreaterThan(.2)
      expect(box.max.y - box.min.y, root.name).toBeGreaterThan(1)
      root.traverse((node) => {
        if (!node.isMesh) return
        expect(node.geometry.index, root.name).toBeTruthy()
        expect(node.geometry.attributes.normal, root.name).toBeTruthy()
        expect(node.geometry.attributes.color, root.name).toBeTruthy()
        expect(node.material.map, root.name).toBeNull()
        expect([...node.geometry.attributes.position.array].every(Number.isFinite)).toBe(true)
      })
    }
  })

  it('stays within the transfer, triangle and material budgets', () => {
    let triangles = 0
    let primitives = 0
    modelFile.scene.traverse((node) => {
      if (!node.isMesh) return
      primitives += 1
      triangles += node.geometry.index.count / 3
    })
    expect(bytes.length).toBeLessThan(700 * 1024)
    expect(triangles).toBeLessThan(50000)
    expect(primitives).toBeLessThanOrEqual(36)
  })
})
