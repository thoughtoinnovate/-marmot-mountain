import { describe, expect, it } from 'vitest'
import { createBox, createMountain, createSphere } from './Geometry'

describe('procedural geometry', () => {
  it('creates finite triangle data for common primitives', () => {
    const geometries = [
      createBox([1, 1, 1], [1, 1, 1]),
      createSphere(1, 8, 6, [0.8, 0.5, 0.2]),
      createMountain(2, 4, 8, 5, [0.3, 0.4, 0.4], [0.9, 0.95, 0.95]),
    ]
    for (const geometry of geometries) {
      expect(geometry.positions.length).toBeGreaterThan(0)
      expect(geometry.positions.length).toBe(geometry.normals.length)
      expect(geometry.positions.length).toBe(geometry.colors.length)
      expect(geometry.positions.every(Number.isFinite)).toBe(true)
      expect(geometry.normals.every(Number.isFinite)).toBe(true)
    }
  })
})
