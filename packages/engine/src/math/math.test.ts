import { describe, expect, it } from 'vitest'
import { Camera } from '../math/Camera'
import { createMat4, fromTRS, invertMat4, transformPoint } from '../math/Mat4'
import { Ray } from '../math/Ray'
import { Vec3 } from '../math/Vec3'

describe('Vec3', () => {
  it('normalizes and combines vectors', () => {
    const vector = new Vec3(3, 4, 0).normalize()
    expect(vector.x).toBeCloseTo(0.6)
    expect(vector.y).toBeCloseTo(0.8)
    expect(vector.length()).toBeCloseTo(1)
  })

  it('calculates cross products', () => {
    const result = new Vec3(1, 0, 0).cross(new Vec3(0, 1, 0))
    expect(result.z).toBeCloseTo(1)
  })
})

describe('Mat4', () => {
  it('transforms and inverts a composed transform', () => {
    const transform = fromTRS(
      createMat4(),
      new Vec3(2, 3, 4),
      new Vec3(0, 0, 0),
      new Vec3(2, 2, 2),
    )
    const point = transformPoint(new Vec3(), transform, new Vec3(1, 1, 1))
    expect(point.x).toBeCloseTo(4)
    expect(point.y).toBeCloseTo(5)
    expect(point.z).toBeCloseTo(6)
    const inverse = invertMat4(createMat4(), transform)
    expect(inverse).not.toBeNull()
    if (inverse) {
      const restored = transformPoint(new Vec3(), inverse, point)
      expect(restored.x).toBeCloseTo(1)
      expect(restored.y).toBeCloseTo(1)
      expect(restored.z).toBeCloseTo(1)
    }
  })
})

describe('Ray and Camera', () => {
  it('finds the nearest sphere intersection', () => {
    const ray = new Ray(new Vec3(0, 0, 5), new Vec3(0, 0, -1))
    expect(ray.intersectSphere(new Vec3(0, 0, 0), 1)).toBeCloseTo(4)
    expect(ray.intersectSphere(new Vec3(3, 0, 0), 1)).toBeNull()
  })

  it('unprojects a center-screen point', () => {
    const camera = new Camera()
    camera.position.set(0, 4, 10)
    camera.target.set(0, 0, 0)
    camera.update(1)
    const ray = camera.screenRay(500, 400, 1000, 800)
    expect(ray.direction.x).toBeCloseTo(0)
    expect(ray.direction.y).toBeLessThan(0)
  })
})
