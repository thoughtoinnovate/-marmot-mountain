import {
  createMat4,
  invertMat4,
  lookAt,
  multiplyMat4,
  perspective,
  type Mat4,
} from './Mat4'
import { Ray } from './Ray'
import { Vec3 } from './Vec3'

export class Camera {
  readonly position = new Vec3(0, 7, 12)
  readonly target = new Vec3(0, 1, -2)
  readonly up = Vec3.up()
  readonly view: Mat4 = createMat4()
  readonly projection: Mat4 = createMat4()
  readonly viewProjection: Mat4 = createMat4()
  readonly inverseViewProjection: Mat4 = createMat4()
  aspect = 1
  fieldOfView = Math.PI / 4
  near = 0.1
  far = 80

  update(aspect: number): void {
    this.aspect = Math.max(aspect, 0.0001)
    perspective(this.projection, this.fieldOfView, this.aspect, this.near, this.far)
    lookAt(this.view, this.position, this.target, this.up)
    multiplyMat4(this.viewProjection, this.projection, this.view)
    invertMat4(this.inverseViewProjection, this.viewProjection)
  }

  screenRay(x: number, y: number, width: number, height: number): Ray {
    const near = this.unproject(x, y, width, height, -1)
    const far = this.unproject(x, y, width, height, 1)
    return new Ray(near, far.subtract(near).normalize())
  }

  private unproject(x: number, y: number, width: number, height: number, depth: number): Vec3 {
    const matrix = this.inverseViewProjection
    const ndcX = (x / Math.max(width, 1)) * 2 - 1
    const ndcY = 1 - (y / Math.max(height, 1)) * 2
    const point = new Vec3(ndcX, ndcY, depth)
    const w = (matrix[3] ?? 0) * point.x + (matrix[7] ?? 0) * point.y + (matrix[11] ?? 0) * point.z + (matrix[15] ?? 1)
    const divisor = Math.abs(w) < 0.000001 ? 1 : w
    return new Vec3(
      ((matrix[0] ?? 0) * point.x + (matrix[4] ?? 0) * point.y + (matrix[8] ?? 0) * point.z + (matrix[12] ?? 0)) / divisor,
      ((matrix[1] ?? 0) * point.x + (matrix[5] ?? 0) * point.y + (matrix[9] ?? 0) * point.z + (matrix[13] ?? 0)) / divisor,
      ((matrix[2] ?? 0) * point.x + (matrix[6] ?? 0) * point.y + (matrix[10] ?? 0) * point.z + (matrix[14] ?? 0)) / divisor,
    )
  }
}
