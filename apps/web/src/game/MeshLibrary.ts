import {
  createBox,
  createCylinder,
  createGround,
  createMountain,
  createOctahedron,
  createSphere,
  createTorus,
  type Mesh,
  type Renderer,
} from '@marmot/engine'

export class MeshLibrary {
  readonly ground: Mesh
  readonly mountain: Mesh
  readonly darkHole: Mesh
  readonly dirtRim: Mesh
  readonly body: Mesh
  readonly belly: Mesh
  readonly head: Mesh
  readonly muzzle: Mesh
  readonly nose: Mesh
  readonly eye: Mesh
  readonly eyeHighlight: Mesh
  readonly ear: Mesh
  readonly tooth: Mesh
  readonly treeTrunk: Mesh
  readonly treeTop: Mesh
  readonly rock: Mesh
  readonly flower: Mesh
  readonly snowflake: Mesh
  readonly cloud: Mesh
  readonly particle: Mesh

  constructor(renderer: Renderer) {
    this.ground = renderer.createMesh(
      createGround(36, 38, 24, 24, groundHeight, meadowColor),
    )
    this.mountain = renderer.createMesh(createMountain(1, 1, 9, 6, [0.28, 0.39, 0.43], [0.92, 0.96, 0.96]))
    this.darkHole = renderer.createMesh(createCylinder(0.5, 0.55, 0.08, 14, [0.055, 0.04, 0.035], [0.025, 0.02, 0.018]))
    this.dirtRim = renderer.createMesh(createTorus(0.57, 0.11, 14, 6, [0.34, 0.19, 0.08]))
    this.body = renderer.createMesh(createSphere(0.72, 10, 7, [0.54, 0.3, 0.15]))
    this.belly = renderer.createMesh(createSphere(0.52, 9, 6, [0.88, 0.69, 0.4]))
    this.head = renderer.createMesh(createSphere(0.64, 10, 7, [0.61, 0.35, 0.18]))
    this.muzzle = renderer.createMesh(createSphere(0.34, 8, 6, [0.92, 0.73, 0.43]))
    this.nose = renderer.createMesh(createSphere(0.13, 7, 5, [0.1, 0.055, 0.04]))
    this.eye = renderer.createMesh(createSphere(0.1, 7, 5, [0.055, 0.04, 0.03]))
    this.eyeHighlight = renderer.createMesh(createSphere(0.032, 5, 4, [1, 0.98, 0.86]))
    this.ear = renderer.createMesh(createSphere(0.18, 7, 5, [0.48, 0.25, 0.12]))
    this.tooth = renderer.createMesh(createBox([0.16, 0.18, 0.08], [0.98, 0.94, 0.76]))
    this.treeTrunk = renderer.createMesh(createCylinder(0.12, 0.19, 1.6, 7, [0.3, 0.16, 0.07]))
    this.treeTop = renderer.createMesh(createCylinder(0, 0.92, 2.15, 8, [0.08, 0.35, 0.22], [0.07, 0.29, 0.18]))
    this.rock = renderer.createMesh(createSphere(0.5, 7, 5, [0.4, 0.44, 0.43]))
    this.flower = renderer.createMesh(createOctahedron(0.12, [1, 0.77, 0.2]))
    this.snowflake = renderer.createMesh(createOctahedron(0.055, [0.94, 0.98, 1]))
    this.cloud = renderer.createMesh(createSphere(1, 9, 6, [0.95, 0.98, 0.98]))
    this.particle = renderer.createMesh(createOctahedron(0.12, [1, 1, 1]))
  }

  destroy(): void {
    const meshes = Object.values(this)
    for (const value of meshes) {
      if (typeof value === 'object' && value !== null && 'destroy' in value) {
        const destroyable = value as Mesh
        destroyable.destroy()
      }
    }
  }
}

export function groundHeight(x: number, z: number): number {
  return (
    Math.sin(x * 0.31) * 0.15 +
    Math.cos(z * 0.27) * 0.12 +
    Math.sin((x + z) * 0.16) * 0.09
  )
}

function meadowColor(x: number, z: number): readonly [number, number, number] {
  const variation = Math.sin(x * 0.8 + z * 0.47) * 0.025
  return [0.26 + variation, 0.58 + variation * 0.6, 0.25 + variation * 0.4]
}
