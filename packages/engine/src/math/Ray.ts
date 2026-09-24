import type { Vec3 } from './Vec3'

export class Ray {
  constructor(
    public readonly origin: Vec3,
    public readonly direction: Vec3,
  ) {}

  intersectSphere(center: Vec3, radius: number): number | null {
    const offsetX = this.origin.x - center.x
    const offsetY = this.origin.y - center.y
    const offsetZ = this.origin.z - center.z
    const b = offsetX * this.direction.x + offsetY * this.direction.y + offsetZ * this.direction.z
    const c = offsetX * offsetX + offsetY * offsetY + offsetZ * offsetZ - radius * radius
    const discriminant = b * b - c
    if (discriminant < 0) {
      return null
    }
    const root = Math.sqrt(discriminant)
    const near = -b - root
    const far = -b + root
    if (near >= 0) {
      return near
    }
    return far >= 0 ? 0 : null
  }
}
