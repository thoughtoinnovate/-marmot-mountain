import { describe, expect, it } from 'vitest'
import type { Mesh } from '@marmot/engine'
import { getDifficulty } from './difficulty'
import { MarmotTarget } from './MarmotTarget'
import type { MeshLibrary } from './MeshLibrary'

function createMeshes(): MeshLibrary {
  const mesh = {} as Mesh
  return {
    body: mesh,
    belly: mesh,
    head: mesh,
    muzzle: mesh,
    nose: mesh,
    eye: mesh,
    eyeHighlight: mesh,
    ear: mesh,
    tooth: mesh,
  } as unknown as MeshLibrary
}

describe('MarmotTarget', () => {
  it('keeps its assigned hole position across spawn cycles', () => {
    const target = new MarmotTarget(
      'marmot-test',
      { x: 4, z: -2 },
      createMeshes(),
      { onMiss: () => undefined, onFinished: () => undefined },
    )
    target.position.set(4, 0, -2)
    target.activate(getDifficulty(0), 0.4)
    expect(target.position.x).toBe(4)
    expect(target.position.z).toBe(-2)
    for (let index = 0; index < 120; index += 1) {
      target.update(1 / 60)
    }
    expect(target.position.x).toBe(4)
    expect(target.position.z).toBe(-2)
  })
})
