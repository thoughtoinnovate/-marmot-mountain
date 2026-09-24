import { Node, Vec3, type Color, type Scene } from '@marmot/engine'
import type { MeshLibrary } from './MeshLibrary'

interface Particle {
  node: Node
  velocity: Vec3
  age: number
  lifetime: number
}

export class ParticleBursts {
  private readonly particles = new Set<Particle>()

  constructor(
    private readonly scene: Scene,
    private readonly meshes: MeshLibrary,
  ) {}

  burst(position: Vec3, color: Color): void {
    for (let index = 0; index < 12; index += 1) {
      const node = new Node('catch-particle')
      node.mesh = this.meshes.particle
      node.position.set(position.x, position.y, position.z)
      node.tint = color
      node.castShadow = false
      const angle = Math.random() * Math.PI * 2
      const horizontal = 1.4 + Math.random() * 1.8
      const velocity = new Vec3(
        Math.cos(angle) * horizontal,
        2.2 + Math.random() * 2.8,
        Math.sin(angle) * horizontal,
      )
      const particle: Particle = {
        node,
        velocity,
        age: 0,
        lifetime: 0.5 + Math.random() * 0.3,
      }
      node.updateCallback = (current, deltaTime) => {
        particle.age += deltaTime
        const progress = particle.age / particle.lifetime
        current.position.add(velocity.clone().scale(deltaTime))
        velocity.y -= 7.5 * deltaTime
        current.rotation.x += deltaTime * 7
        current.rotation.y += deltaTime * 5
        const size = Math.max(0.001, 1 - progress)
        current.scale.set(size, size, size)
        if (progress >= 1) {
          this.scene.remove(current)
          this.particles.delete(particle)
        }
      }
      this.particles.add(particle)
      this.scene.add(node)
    }
  }

  clear(): void {
    for (const particle of this.particles) {
      this.scene.remove(particle.node)
    }
    this.particles.clear()
  }
}
