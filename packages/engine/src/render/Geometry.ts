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
  const point = (width: number, height: number): Point3 => {
    const longitude = (width / widthSegments) * Math.PI * 2
    const latitude = (height / heightSegments) * Math.PI
    const ring = Math.sin(latitude)
    return [
      Math.cos(longitude) * ring * radius,
      Math.cos(latitude) * radius,
      Math.sin(longitude) * ring * radius,
    ]
  }
  for (let height = 0; height < heightSegments; height += 1) {
    for (let width = 0; width < widthSegments; width += 1) {
      const shade = ((width + height * 3) % 4) * 0.018
      addQuad(
        data,
        point(width, height),
        point(width + 1, height),
        point(width + 1, height + 1),
        point(width, height + 1),
        variation(color, shade),
        variation(color, -shade),
      )
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
  for (let depthIndex = 0; depthIndex < depthSegments; depthIndex += 1) {
    for (let widthIndex = 0; widthIndex < widthSegments; widthIndex += 1) {
      const a = point(widthIndex, depthIndex)
      const b = point(widthIndex + 1, depthIndex)
      const c = point(widthIndex + 1, depthIndex + 1)
      const d = point(widthIndex, depthIndex + 1)
      const centerX = (a[0] + c[0]) / 2
      const centerZ = (a[2] + c[2]) / 2
      const color = colorAt(centerX, centerZ)
      addTriangle(data, a, b, c, color)
      addTriangle(data, a, c, d, variation(color, 0.018))
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
