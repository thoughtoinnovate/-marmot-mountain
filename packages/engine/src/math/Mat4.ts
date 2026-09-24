import type { Vec3 } from './Vec3'

export type Mat4 = Float32Array

export function createMat4(): Mat4 {
  const matrix = new Float32Array(16)
  matrix[0] = 1
  matrix[5] = 1
  matrix[10] = 1
  matrix[15] = 1
  return matrix
}

export function identity(out: Mat4): Mat4 {
  out.fill(0)
  out[0] = 1
  out[5] = 1
  out[10] = 1
  out[15] = 1
  return out
}

export function copyMat4(out: Mat4, matrix: Mat4): Mat4 {
  out.set(matrix)
  return out
}

export function multiplyMat4(out: Mat4, a: Mat4, b: Mat4): Mat4 {
  const a00 = a[0] ?? 0
  const a01 = a[1] ?? 0
  const a02 = a[2] ?? 0
  const a03 = a[3] ?? 0
  const a10 = a[4] ?? 0
  const a11 = a[5] ?? 0
  const a12 = a[6] ?? 0
  const a13 = a[7] ?? 0
  const a20 = a[8] ?? 0
  const a21 = a[9] ?? 0
  const a22 = a[10] ?? 0
  const a23 = a[11] ?? 0
  const a30 = a[12] ?? 0
  const a31 = a[13] ?? 0
  const a32 = a[14] ?? 0
  const a33 = a[15] ?? 0
  const b00 = b[0] ?? 0
  const b01 = b[1] ?? 0
  const b02 = b[2] ?? 0
  const b03 = b[3] ?? 0
  const b10 = b[4] ?? 0
  const b11 = b[5] ?? 0
  const b12 = b[6] ?? 0
  const b13 = b[7] ?? 0
  const b20 = b[8] ?? 0
  const b21 = b[9] ?? 0
  const b22 = b[10] ?? 0
  const b23 = b[11] ?? 0
  const b30 = b[12] ?? 0
  const b31 = b[13] ?? 0
  const b32 = b[14] ?? 0
  const b33 = b[15] ?? 0

  out[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30
  out[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31
  out[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32
  out[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33
  out[4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30
  out[5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31
  out[6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32
  out[7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33
  out[8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30
  out[9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31
  out[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32
  out[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33
  out[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30
  out[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31
  out[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32
  out[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33
  return out
}

export function fromTranslation(out: Mat4, value: Vec3): Mat4 {
  identity(out)
  out[12] = value.x
  out[13] = value.y
  out[14] = value.z
  return out
}

export function fromScale(out: Mat4, value: Vec3): Mat4 {
  identity(out)
  out[0] = value.x
  out[5] = value.y
  out[10] = value.z
  return out
}

export function fromRotation(out: Mat4, rotation: Vec3): Mat4 {
  const cosX = Math.cos(rotation.x)
  const sinX = Math.sin(rotation.x)
  const cosY = Math.cos(rotation.y)
  const sinY = Math.sin(rotation.y)
  const cosZ = Math.cos(rotation.z)
  const sinZ = Math.sin(rotation.z)

  out[0] = cosY * cosZ + sinY * sinX * sinZ
  out[1] = -cosY * sinZ + sinY * sinX * cosZ
  out[2] = sinY * cosX
  out[3] = 0
  out[4] = cosX * sinZ
  out[5] = cosX * cosZ
  out[6] = -sinX
  out[7] = 0
  out[8] = -sinY * cosZ + cosY * sinX * sinZ
  out[9] = sinY * sinZ + cosY * sinX * cosZ
  out[10] = cosY * cosX
  out[11] = 0
  out[12] = 0
  out[13] = 0
  out[14] = 0
  out[15] = 1
  return out
}

export function fromTRS(out: Mat4, position: Vec3, rotation: Vec3, scale: Vec3): Mat4 {
  const cosX = Math.cos(rotation.x)
  const sinX = Math.sin(rotation.x)
  const cosY = Math.cos(rotation.y)
  const sinY = Math.sin(rotation.y)
  const cosZ = Math.cos(rotation.z)
  const sinZ = Math.sin(rotation.z)

  out[0] = (cosY * cosZ + sinY * sinX * sinZ) * scale.x
  out[1] = (-cosY * sinZ + sinY * sinX * cosZ) * scale.x
  out[2] = sinY * cosX * scale.x
  out[3] = 0
  out[4] = cosX * sinZ * scale.y
  out[5] = cosX * cosZ * scale.y
  out[6] = -sinX * scale.y
  out[7] = 0
  out[8] = (-sinY * cosZ + cosY * sinX * sinZ) * scale.z
  out[9] = (sinY * sinZ + cosY * sinX * cosZ) * scale.z
  out[10] = cosY * cosX * scale.z
  out[11] = 0
  out[12] = position.x
  out[13] = position.y
  out[14] = position.z
  out[15] = 1
  return out
}

export function perspective(out: Mat4, fieldOfView: number, aspect: number, near: number, far: number): Mat4 {
  const factor = 1 / Math.tan(fieldOfView / 2)
  out.fill(0)
  out[0] = factor / Math.max(aspect, 0.0001)
  out[5] = factor
  out[11] = -1
  out[10] = (far + near) / (near - far)
  out[14] = (2 * far * near) / (near - far)
  return out
}

export function orthographic(
  out: Mat4,
  left: number,
  right: number,
  bottom: number,
  top: number,
  near: number,
  far: number,
): Mat4 {
  out.fill(0)
  out[0] = 2 / (right - left)
  out[5] = 2 / (top - bottom)
  out[10] = 2 / (near - far)
  out[12] = (left + right) / (left - right)
  out[13] = (top + bottom) / (bottom - top)
  out[14] = (far + near) / (near - far)
  out[15] = 1
  return out
}

export function lookAt(out: Mat4, eye: Vec3, center: Vec3, up: Vec3): Mat4 {
  const forward = eye.clone().subtract(center).normalize()
  const right = up.clone().cross(forward).normalize()
  const actualUp = forward.clone().cross(right)
  out[0] = right.x
  out[1] = actualUp.x
  out[2] = forward.x
  out[3] = 0
  out[4] = right.y
  out[5] = actualUp.y
  out[6] = forward.y
  out[7] = 0
  out[8] = right.z
  out[9] = actualUp.z
  out[10] = forward.z
  out[11] = 0
  out[12] = -right.dot(eye)
  out[13] = -actualUp.dot(eye)
  out[14] = -forward.dot(eye)
  out[15] = 1
  return out
}

export function invertMat4(out: Mat4, matrix: Mat4): Mat4 | null {
  const a00 = matrix[0] ?? 0
  const a01 = matrix[1] ?? 0
  const a02 = matrix[2] ?? 0
  const a03 = matrix[3] ?? 0
  const a10 = matrix[4] ?? 0
  const a11 = matrix[5] ?? 0
  const a12 = matrix[6] ?? 0
  const a13 = matrix[7] ?? 0
  const a20 = matrix[8] ?? 0
  const a21 = matrix[9] ?? 0
  const a22 = matrix[10] ?? 0
  const a23 = matrix[11] ?? 0
  const a30 = matrix[12] ?? 0
  const a31 = matrix[13] ?? 0
  const a32 = matrix[14] ?? 0
  const a33 = matrix[15] ?? 0
  const b00 = a00 * a11 - a01 * a10
  const b01 = a00 * a12 - a02 * a10
  const b02 = a00 * a13 - a03 * a10
  const b03 = a01 * a12 - a02 * a11
  const b04 = a01 * a13 - a03 * a11
  const b05 = a02 * a13 - a03 * a12
  const b06 = a20 * a31 - a21 * a30
  const b07 = a20 * a32 - a22 * a30
  const b08 = a20 * a33 - a23 * a30
  const b09 = a21 * a32 - a22 * a31
  const b10 = a21 * a33 - a23 * a31
  const b11 = a22 * a33 - a23 * a32
  const determinant = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06

  if (Math.abs(determinant) < 0.0000001) {
    return null
  }

  const inverse = 1 / determinant
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * inverse
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * inverse
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * inverse
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * inverse
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * inverse
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * inverse
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * inverse
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * inverse
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * inverse
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * inverse
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * inverse
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * inverse
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * inverse
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * inverse
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * inverse
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * inverse
  return out
}

export function transformPoint(out: Vec3, matrix: Mat4, point: Vec3): Vec3 {
  const x = point.x
  const y = point.y
  const z = point.z
  const w = (matrix[3] ?? 0) * x + (matrix[7] ?? 0) * y + (matrix[11] ?? 0) * z + (matrix[15] ?? 1)
  const divisor = Math.abs(w) < 0.000001 ? 1 : w
  out.x = ((matrix[0] ?? 0) * x + (matrix[4] ?? 0) * y + (matrix[8] ?? 0) * z + (matrix[12] ?? 0)) / divisor
  out.y = ((matrix[1] ?? 0) * x + (matrix[5] ?? 0) * y + (matrix[9] ?? 0) * z + (matrix[13] ?? 0)) / divisor
  out.z = ((matrix[2] ?? 0) * x + (matrix[6] ?? 0) * y + (matrix[10] ?? 0) * z + (matrix[14] ?? 0)) / divisor
  return out
}

export function transformDirection(out: Vec3, matrix: Mat4, direction: Vec3): Vec3 {
  const x = direction.x
  const y = direction.y
  const z = direction.z
  out.x = (matrix[0] ?? 0) * x + (matrix[4] ?? 0) * y + (matrix[8] ?? 0) * z
  out.y = (matrix[1] ?? 0) * x + (matrix[5] ?? 0) * y + (matrix[9] ?? 0) * z
  out.z = (matrix[2] ?? 0) * x + (matrix[6] ?? 0) * y + (matrix[10] ?? 0) * z
  return out.normalize()
}

export function normalMatrix3(out: Float32Array, matrix: Mat4): Float32Array {
  const inverse = invertMat4(new Float32Array(16), matrix)
  if (!inverse) {
    out[0] = 1
    out[4] = 0
    out[8] = 0
    out[1] = 0
    out[5] = 1
    out[9] = 0
    out[2] = 0
    out[6] = 0
    out[10] = 1
    return out
  }
  out[0] = inverse[0] ?? 1
  out[1] = inverse[4] ?? 0
  out[2] = inverse[8] ?? 0
  out[3] = inverse[1] ?? 0
  out[4] = inverse[5] ?? 1
  out[5] = inverse[9] ?? 0
  out[6] = inverse[2] ?? 0
  out[7] = inverse[6] ?? 0
  out[8] = inverse[10] ?? 1
  return out
}
