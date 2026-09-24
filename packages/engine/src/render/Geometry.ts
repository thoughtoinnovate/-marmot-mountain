export type Color3 = readonly [number, number, number]

type Point3 = readonly [number, number, number]

export interface GeometryData {
  positions: number[]
  normals: number[]
  colors: number[]
}

function clampColor(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value * 255)))
}

function variation(color: Color3, amount: number): Color3 {
  return [
    Math.max(0, Math.min(1, color[0] + amount)),
    Math.max(0, Math.min(1, color[1] + amount)),
    Math.max(0, Math.min(1, color[2] + amount)),
  ]
}

function addTriangleWithNormals(
  data: GeometryData,
  a: Point3,
  b: Point3,
  c: Point3,
  normalA: Point3,
  normalB: Point3,
  normalC: Point3,
  color: Color3,
): void {
  for (const [point, normal] of [[a, normalA], [b, normalB], [c, normalC]] as const) {
    data.positions.push(point[0], point[1], point[2])
    data.normals.push(normal[0], normal[1], normal[2])
    data.colors.push(clampColor(color[0]), clampColor(color[1]), clampColor(color[2]))
  }
}

function addSmoothQuad(
  data: GeometryData,
  a: Point3,
  b: Point3,
  c: Point3,
  d: Point3,
  normalA: Point3,
  normalB: Point3,
  normalC: Point3,
  normalD: Point3,
  color: Color3,
): void {
  addTriangleWithNormals(data, a, b, c, normalA, normalB, normalC, color)
  addTriangleWithNormals(data, a, c, d, normalA, normalC, normalD, variation(color, 0.012))
}

function addTriangle(data: GeometryData, a: Point3, b: Point3, c: Point3, color: Color3): void {
  const abx = b[0] - a[0]
  const aby = b[1] - a[1]
  const abz = b[2] - a[2]
  const acx = c[0] - a[0]
  const acy = c[1] - a[1]
  const acz = c[2] - a[2]
  let nx = aby * acz - abz * acy
  let ny = abz * acx - abx * acz
  let nz = abx * acy - aby * acx
  const magnitude = Math.hypot(nx, ny, nz)
  if (magnitude > 0.000001) {
    nx /= magnitude
    ny /= magnitude
    nz /= magnitude
  } else {
    ny = 1
  }
  for (const point of [a, b, c]) {
    data.positions.push(point[0], point[1], point[2])
    data.normals.push(nx, ny, nz)
    data.colors.push(clampColor(color[0]), clampColor(color[1]), clampColor(color[2]))
  }
}

function addQuad(
  data: GeometryData,
  a: Point3,
  b: Point3,
  c: Point3,
  d: Point3,
  firstColor: Color3,
  secondColor: Color3,
): void {
  addTriangle(data, a, b, d, firstColor)
  addTriangle(data, b, c, d, secondColor)
}

export function createBox(size: Point3, color: Color3): GeometryData {
  const data: GeometryData = { positions: [], normals: [], colors: [] }
  const x = size[0] / 2
  const y = size[1] / 2
  const z = size[2] / 2
  addQuad(data, [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z], variation(color, 0.03), color)
  addQuad(data, [x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z], variation(color, -0.04), variation(color, -0.01))
  addQuad(data, [x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z], variation(color, 0.02), variation(color, 0.06))
  addQuad(data, [-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z], variation(color, -0.05), color)
  addQuad(data, [-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z], variation(color, 0.08), color)
  addQuad(data, [-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z], variation(color, -0.09), variation(color, -0.04))
  return data
}

export function createSphere(radius: number, widthSegments: number, heightSegments: number, color: Color3): GeometryData {
  const data: GeometryData = { positions: [], normals: [], colors: [] }
  const vertex = (width: number, height: number): readonly [Point3, Point3] => {
    const longitude = (width / widthSegments) * Math.PI * 2
    const latitude = (height / heightSegments) * Math.PI
    const ring = Math.sin(latitude)
    const normal: Point3 = [Math.cos(longitude) * ring, Math.cos(latitude), Math.sin(longitude) * ring]
    return [
      [normal[0] * radius, normal[1] * radius, normal[2] * radius],
      normal,
    ]
  }
  for (let height = 0; height < heightSegments; height += 1) {
    for (let width = 0; width < widthSegments; width += 1) {
      const a = vertex(width, height)
      const b = vertex(width + 1, height)
      const c = vertex(width + 1, height + 1)
      const d = vertex(width, height + 1)
      addSmoothQuad(data, a[0], b[0], c[0], d[0], a[1], b[1], c[1], d[1], color)
    }
  }
  return data
}

export function createCylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  segments: number,
  sideColor: Color3,
  capColor: Color3 = sideColor,
): GeometryData {
  const data: GeometryData = { positions: [], normals: [], colors: [] }
  const halfHeight = height / 2
  for (let segment = 0; segment < segments; segment += 1) {
    const next = (segment + 1) % segments
    const angle = (segment / segments) * Math.PI * 2
    const nextAngle = (next / segments) * Math.PI * 2
    const topA: Point3 = [Math.cos(angle) * radiusTop, halfHeight, Math.sin(angle) * radiusTop]
    const topB: Point3 = [Math.cos(nextAngle) * radiusTop, halfHeight, Math.sin(nextAngle) * radiusTop]
    const bottomA: Point3 = [Math.cos(angle) * radiusBottom, -halfHeight, Math.sin(angle) * radiusBottom]
    const bottomB: Point3 = [Math.cos(nextAngle) * radiusBottom, -halfHeight, Math.sin(nextAngle) * radiusBottom]
    addQuad(
      data,
      bottomA,
      bottomB,
      topB,
      topA,
      variation(sideColor, segment % 2 === 0 ? 0.03 : -0.03),
      sideColor,
    )
    addTriangle(data, [0, halfHeight, 0], topA, topB, capColor)
    addTriangle(data, [0, -halfHeight, 0], bottomB, bottomA, variation(capColor, -0.05))
  }
  return data
}

export function createOctahedron(radius: number, color: Color3): GeometryData {
  const data: GeometryData = { positions: [], normals: [], colors: [] }
  const top: Point3 = [0, radius, 0]
  const bottom: Point3 = [0, -radius, 0]
  const right: Point3 = [radius, 0, 0]
  const left: Point3 = [-radius, 0, 0]
  const front: Point3 = [0, 0, radius]
  const back: Point3 = [0, 0, -radius]
  addTriangle(data, top, front, right, color)
  addTriangle(data, top, right, back, variation(color, -0.05))
  addTriangle(data, top, back, left, variation(color, 0.04))
  addTriangle(data, top, left, front, color)
  addTriangle(data, bottom, right, front, variation(color, -0.07))
  addTriangle(data, bottom, back, right, variation(color, -0.02))
  addTriangle(data, bottom, left, back, variation(color, -0.08))
  addTriangle(data, bottom, front, left, variation(color, -0.04))
  return data
}

export function createStar(radius: number, innerRadius: number, points: number, thickness: number, color: Color3): GeometryData {
  const data: GeometryData = { positions: [], normals: [], colors: [] }
  const outline: Point3[] = []
  for (let index = 0; index < points * 2; index += 1) {
    const angle = -Math.PI / 2 + (index / (points * 2)) * Math.PI * 2
    const pointRadius = index % 2 === 0 ? radius : innerRadius
    outline.push([Math.cos(angle) * pointRadius, Math.sin(angle) * pointRadius, 0])
  }
  const front: Point3 = [0, 0, thickness]
  const back: Point3 = [0, 0, -thickness]
  for (let index = 0; index < outline.length; index += 1) {
    const a = outline[index] ?? [0, 0, 0]
    const b = outline[(index + 1) % outline.length] ?? [0, 0, 0]
    addTriangle(data, front, a, b, color)
    addTriangle(data, back, b, a, variation(color, -0.05))
    addQuad(
      data,
      [a[0], a[1], thickness],
      [b[0], b[1], thickness],
      [b[0], b[1], -thickness],
      [a[0], a[1], -thickness],
      variation(color, 0.04),
      variation(color, -0.03),
    )
  }
  return data
}

export function createFeather(length: number, width: number, thickness: number, color: Color3): GeometryData {
  const data: GeometryData = { positions: [], normals: [], colors: [] }
  const tip: Point3 = [0, length * 0.55, 0]
  const upperLeft: Point3 = [-width * 0.5, length * 0.08, 0]
  const upperRight: Point3 = [width * 0.5, length * 0.08, 0]
  const lowerLeft: Point3 = [-width * 0.35, -length * 0.28, 0]
  const lowerRight: Point3 = [width * 0.35, -length * 0.28, 0]
  const base: Point3 = [0, -length * 0.55, 0]
  const front: Point3 = [0, -length * 0.04, thickness]
  const back: Point3 = [0, -length * 0.04, -thickness]
  addTriangle(data, front, tip, upperRight, color)
  addTriangle(data, front, upperRight, lowerRight, variation(color, 0.03))
  addTriangle(data, front, lowerRight, base, variation(color, -0.02))
  addTriangle(data, front, base, lowerLeft, variation(color, -0.05))
  addTriangle(data, front, lowerLeft, upperLeft, variation(color, 0.015))
  addTriangle(data, front, upperLeft, tip, variation(color, 0.02))
  addTriangle(data, back, upperRight, tip, variation(color, -0.08))
  addTriangle(data, back, lowerRight, upperRight, variation(color, -0.04))
  addTriangle(data, back, base, lowerRight, variation(color, -0.07))
  addTriangle(data, back, lowerLeft, base, variation(color, -0.09))
  addTriangle(data, back, upperLeft, lowerLeft, variation(color, -0.075))
  addTriangle(data, back, tip, upperLeft, variation(color, -0.06))
  return data
}

export function createTorus(
  majorRadius: number,
  minorRadius: number,
  ringSegments: number,
  tubeSegments: number,
  color: Color3,
): GeometryData {
  const data: GeometryData = { positions: [], normals: [], colors: [] }
  const point = (ring: number, tube: number): Point3 => {
    const angle = (ring / ringSegments) * Math.PI * 2
    const nextAngle = (tube / tubeSegments) * Math.PI * 2
    const radius = majorRadius + Math.cos(nextAngle) * minorRadius
    return [Math.cos(angle) * radius, Math.sin(nextAngle) * minorRadius, Math.sin(angle) * radius]
  }
  for (let ring = 0; ring < ringSegments; ring += 1) {
    for (let tube = 0; tube < tubeSegments; tube += 1) {
      const shade = ((ring + tube) % 3) * 0.025
      addQuad(
        data,
        point(ring, tube),
        point(ring + 1, tube),
        point(ring + 1, tube + 1),
        point(ring, tube + 1),
        variation(color, shade),
        variation(color, -shade),
      )
    }
  }
  return data
}

export function createGround(
  width: number,
  depth: number,
  widthSegments: number,
  depthSegments: number,
  heightAt: (x: number, z: number) => number,
  colorAt: (x: number, z: number) => Color3,
): GeometryData {
  const data: GeometryData = { positions: [], normals: [], colors: [] }
  const point = (widthIndex: number, depthIndex: number): Point3 => {
    const x = (widthIndex / widthSegments - 0.5) * width
    const z = (depthIndex / depthSegments - 0.5) * depth
    return [x, heightAt(x, z), z]
  }
  const normalAt = (x: number, z: number): Point3 => {
    const step = 0.01
    const slopeX = heightAt(x + step, z) - heightAt(x - step, z)
    const slopeZ = heightAt(x, z + step) - heightAt(x, z - step)
    const length = Math.hypot(-slopeX, 1, -slopeZ)
    return [-slopeX / length, 1 / length, -slopeZ / length]
  }
  for (let depthIndex = 0; depthIndex < depthSegments; depthIndex += 1) {
    for (let widthIndex = 0; widthIndex < widthSegments; widthIndex += 1) {
      const a = point(widthIndex, depthIndex)
      const b = point(widthIndex + 1, depthIndex)
      const c = point(widthIndex + 1, depthIndex + 1)
      const d = point(widthIndex, depthIndex + 1)
      const centerX = (a[0] + c[0]) / 2
      const centerZ = (a[2] + c[2]) / 2
      const color = colorAt(centerX, centerZ)
      addTriangleWithNormals(data, a, b, c, normalAt(a[0], a[2]), normalAt(b[0], b[2]), normalAt(c[0], c[2]), color)
      addTriangleWithNormals(data, a, c, d, normalAt(a[0], a[2]), normalAt(c[0], c[2]), normalAt(d[0], d[2]), variation(color, 0.018))
    }
  }
  return data
}

export function createMountain(
  baseRadius: number,
  height: number,
  segments: number,
  rings: number,
  rockColor: Color3,
  snowColor: Color3,
): GeometryData {
  const data: GeometryData = { positions: [], normals: [], colors: [] }
  const point = (ring: number, segment: number): Point3 => {
    const progress = ring / rings
    const angle = (segment / segments) * Math.PI * 2
    const unevenness = 1 + Math.sin(segment * 2.17 + ring * 0.91) * 0.07
    const radius = Math.max(0.015, baseRadius * Math.pow(1 - progress, 1.12) * unevenness)
    return [Math.cos(angle) * radius, progress * height, Math.sin(angle) * radius]
  }
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments
      const a = point(ring, segment)
      const b = point(ring + 1, segment)
      const c = point(ring + 1, next)
      const d = point(ring, next)
      const progress = (ring + 0.5) / rings
      const shade = Math.sin(segment * 1.91 + ring) * 0.035
      const color = progress > 0.55 ? variation(snowColor, shade) : variation(rockColor, shade)
      addQuad(data, a, b, c, d, color, variation(color, shade * 0.5))
    }
  }
  return data
}
