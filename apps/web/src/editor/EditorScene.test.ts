import { describe, expect, it } from 'vitest'
import type { Engine } from '@marmot/engine'
import { EditorScene } from './EditorScene'

function createTestEngine(): Engine {
  return {
    renderer: {
      createMesh: () => ({ destroy: () => undefined }),
    },
  } as unknown as Engine
}

describe('EditorScene', () => {
  it('creates, transforms, serializes, and restores primitives', () => {
    const scene = new EditorScene(createTestEngine())
    expect(scene.serialize().objects).toHaveLength(1)
    scene.addPrimitive('orb')
    expect(scene.serialize().objects).toHaveLength(2)
    scene.setTransform('position', 'y', 3.5)
    const document = scene.serialize()
    document.objects[1]!.position.y = 4.25
    expect(scene.load(document)).toBe(true)
    expect(scene.selectedNode?.position.y).toBe(4.25)
    scene.destroy()
  })

  it('rejects malformed scene documents', () => {
    const scene = new EditorScene(createTestEngine())
    expect(scene.load({ version: 1, objects: [{ kind: 'unknown' }] })).toBe(false)
    scene.destroy()
  })
})
