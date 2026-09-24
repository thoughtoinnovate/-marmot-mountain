export class Vec3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
  ) {}

  static zero(): Vec3 {
    return new Vec3(0, 0, 0)
  }

  static one(): Vec3 {
    return new Vec3(1, 1, 1)
  }

  static up(): Vec3 {
    return new Vec3(0, 1, 0)
  }

  static from(values: readonly number[]): Vec3 {
    return new Vec3(values[0] ?? 0, values[1] ?? 0, values[2] ?? 0)
  }

  set(x: number, y: number, z: number): this {
    this.x = x
    this.y = y
    this.z = z
    return this
  }

  copy(value: Vec3): this {
    this.x = value.x
    this.y = value.y
    this.z = value.z
    return this
  }

  clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z)
  }

  add(value: Vec3): this {
    this.x += value.x
    this.y += value.y
    this.z += value.z
    return this
  }

  subtract(value: Vec3): this {
    this.x -= value.x
    this.y -= value.y
    this.z -= value.z
    return this
  }

  scale(value: number): this {
    this.x *= value
    this.y *= value
    this.z *= value
    return this
  }

  multiply(value: Vec3): this {
    this.x *= value.x
    this.y *= value.y
    this.z *= value.z
    return this
  }

  negate(): this {
    this.x = -this.x
    this.y = -this.y
    this.z = -this.z
    return this
  }

  dot(value: Vec3): number {
    return this.x * value.x + this.y * value.y + this.z * value.z
  }

  length(): number {
    return Math.hypot(this.x, this.y, this.z)
  }

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z
  }

  distanceTo(value: Vec3): number {
    return Math.hypot(this.x - value.x, this.y - value.y, this.z - value.z)
  }

  normalize(): this {
    const magnitude = this.length()
    if (magnitude > 0.000001) {
      this.scale(1 / magnitude)
    }
    return this
  }

  lerp(target: Vec3, amount: number): this {
    this.x += (target.x - this.x) * amount
    this.y += (target.y - this.y) * amount
    this.z += (target.z - this.z) * amount
    return this
  }

  cross(value: Vec3): this {
    const ax = this.x
    const ay = this.y
    const az = this.z
    const bx = value.x
    const by = value.y
    const bz = value.z
    this.x = ay * bz - az * by
    this.y = az * bx - ax * bz
    this.z = ax * by - ay * bx
    return this
  }
}
