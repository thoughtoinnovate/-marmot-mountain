import {
  createMat4,
  lookAt,
  multiplyMat4,
  orthographic,
  type Mat4,
} from '../math/Mat4'
import { Vec3 } from '../math/Vec3'
import type { Scene } from '../scene/Scene'
import type { Node } from '../scene/Node'
import type { GeometryData } from './Geometry'
import { Mesh } from './Mesh'

const mainVertexShader = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec3 aColor;
uniform mat4 uModel;
uniform mat3 uNormalMatrix;
uniform mat4 uViewProjection;
uniform mat4 uLightMatrix;
out vec3 vWorldPosition;
out vec3 vWorldNormal;
out vec3 vColor;
out vec4 vShadowPosition;
void main() {
  vec4 worldPosition = uModel * vec4(aPosition, 1.0);
  vWorldPosition = worldPosition.xyz;
  vWorldNormal = normalize(uNormalMatrix * aNormal);
  vColor = aColor;
  vShadowPosition = uLightMatrix * worldPosition;
  gl_Position = uViewProjection * worldPosition;
}`

const mainFragmentShader = `#version 300 es
precision highp float;
in vec3 vWorldPosition;
in vec3 vWorldNormal;
in vec3 vColor;
in vec4 vShadowPosition;
uniform sampler2D uShadowMap;
uniform vec3 uTint;
uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform vec3 uCameraPosition;
uniform vec3 uFogColor;
out vec4 outColor;
float shadowVisibility(vec3 normal) {
  vec3 projected = vShadowPosition.xyz / vShadowPosition.w;
  projected = projected * 0.5 + 0.5;
  if (projected.x < 0.0 || projected.x > 1.0 || projected.y < 0.0 || projected.y > 1.0 || projected.z > 1.0) {
    return 1.0;
  }
  float bias = max(0.0007 * (1.0 - dot(normal, normalize(-uLightDirection))), 0.00025);
  float visibility = 0.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      float depth = texture(uShadowMap, projected.xy + vec2(float(x), float(y)) / 1536.0).r;
      visibility += projected.z - bias <= depth ? 1.0 : 0.0;
    }
  }
  return visibility / 9.0;
}
void main() {
  vec3 normal = normalize(vWorldNormal);
  float diffuse = max(dot(normal, normalize(-uLightDirection)), 0.0);
  float lightBand = floor((0.28 + diffuse * 0.72) * 4.0) / 4.0;
  float visibility = shadowVisibility(normal);
  float lighting = (0.56 + lightBand * 0.44) * mix(0.42, 1.0, visibility);
  vec3 color = vColor * uTint * lighting * uLightColor;
  float fog = smoothstep(25.0, 46.0, length(vWorldPosition - uCameraPosition));
  color = mix(color, uFogColor, fog * 0.72);
  outColor = vec4(color, 1.0);
}`

const shadowVertexShader = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPosition;
uniform mat4 uModel;
uniform mat4 uLightMatrix;
void main() {
  gl_Position = uLightMatrix * uModel * vec4(aPosition, 1.0);
}`

const shadowFragmentShader = `#version 300 es
precision highp float;
void main() {}`

interface MainUniforms {
  model: WebGLUniformLocation
  normalMatrix: WebGLUniformLocation
  viewProjection: WebGLUniformLocation
  lightMatrix: WebGLUniformLocation
  shadowMap: WebGLUniformLocation
  tint: WebGLUniformLocation
  lightDirection: WebGLUniformLocation
  lightColor: WebGLUniformLocation
  cameraPosition: WebGLUniformLocation
  fogColor: WebGLUniformLocation
}

interface ShadowUniforms {
  model: WebGLUniformLocation
  lightMatrix: WebGLUniformLocation
}

export interface RendererOptions {
  lightDirection?: Vec3
  lightColor?: readonly [number, number, number]
  shadowSize?: number
}

export class Renderer {
  readonly gl: WebGL2RenderingContext
  private readonly mainProgram: WebGLProgram
  private readonly shadowProgram: WebGLProgram
  private readonly mainUniforms: MainUniforms
  private readonly shadowUniforms: ShadowUniforms
  private readonly shadowFrameBuffer: WebGLFramebuffer
  private readonly shadowTexture: WebGLTexture
  private readonly shadowSize: number
  private readonly lightDirection: Vec3
  private readonly lightColor: readonly [number, number, number]
  private readonly lightMatrix: Mat4 = createMat4()
  private readonly lightView: Mat4 = createMat4()
  private readonly lightProjection: Mat4 = createMat4()
  private width = 1
  private height = 1

  constructor(gl: WebGL2RenderingContext, options: RendererOptions = {}) {
    this.gl = gl
    this.lightDirection = (options.lightDirection ?? new Vec3(-0.55, 1, 0.5)).normalize()
    this.lightColor = options.lightColor ?? [1.08, 1.02, 0.9]
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
    this.shadowSize = Math.min(options.shadowSize ?? 1536, maxTextureSize)
    this.mainProgram = this.createProgram(mainVertexShader, mainFragmentShader)
    this.shadowProgram = this.createProgram(shadowVertexShader, shadowFragmentShader)
    this.mainUniforms = {
      model: this.uniform(this.mainProgram, 'uModel'),
      normalMatrix: this.uniform(this.mainProgram, 'uNormalMatrix'),
      viewProjection: this.uniform(this.mainProgram, 'uViewProjection'),
      lightMatrix: this.uniform(this.mainProgram, 'uLightMatrix'),
      shadowMap: this.uniform(this.mainProgram, 'uShadowMap'),
      tint: this.uniform(this.mainProgram, 'uTint'),
      lightDirection: this.uniform(this.mainProgram, 'uLightDirection'),
      lightColor: this.uniform(this.mainProgram, 'uLightColor'),
      cameraPosition: this.uniform(this.mainProgram, 'uCameraPosition'),
      fogColor: this.uniform(this.mainProgram, 'uFogColor'),
    }
    this.shadowUniforms = {
      model: this.uniform(this.shadowProgram, 'uModel'),
      lightMatrix: this.uniform(this.shadowProgram, 'uLightMatrix'),
    }

    const shadowTexture = gl.createTexture()
    const shadowFrameBuffer = gl.createFramebuffer()
    if (!shadowTexture || !shadowFrameBuffer) {
      throw new Error('Unable to allocate shadow framebuffer')
    }
    this.shadowTexture = shadowTexture
    this.shadowFrameBuffer = shadowFrameBuffer
    gl.bindTexture(gl.TEXTURE_2D, shadowTexture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.DEPTH_COMPONENT24,
      this.shadowSize,
      this.shadowSize,
      0,
      gl.DEPTH_COMPONENT,
      gl.UNSIGNED_INT,
      null,
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFrameBuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shadowTexture, 0)
    gl.drawBuffers([gl.NONE])
    gl.readBuffer(gl.NONE)
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Shadow framebuffer is incomplete: ${status}`)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.disable(gl.CULL_FACE)
    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL)
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
    this.gl.viewport(0, 0, this.width, this.height)
  }

  createMesh(geometry: GeometryData): Mesh {
    return new Mesh(this.gl, geometry)
  }

  render(scene: Scene): void {
    this.updateLightMatrix()
    this.renderShadows(scene.root)
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.width, this.height)
    gl.clearColor(scene.backgroundColor[0], scene.backgroundColor[1], scene.backgroundColor[2], 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(this.mainProgram)
    gl.uniformMatrix4fv(this.mainUniforms.viewProjection, false, scene.camera.viewProjection)
    gl.uniformMatrix4fv(this.mainUniforms.lightMatrix, false, this.lightMatrix)
    gl.uniform3fv(this.mainUniforms.lightDirection, [this.lightDirection.x, this.lightDirection.y, this.lightDirection.z])
    gl.uniform3fv(this.mainUniforms.lightColor, [...this.lightColor])
    gl.uniform3f(this.mainUniforms.cameraPosition, scene.camera.position.x, scene.camera.position.y, scene.camera.position.z)
    gl.uniform3fv(this.mainUniforms.fogColor, [...scene.backgroundColor])
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture)
    gl.uniform1i(this.mainUniforms.shadowMap, 0)
    this.drawNode(scene.root, this.mainUniforms)
    gl.bindVertexArray(null)
  }

  destroy(): void {
    this.gl.deleteTexture(this.shadowTexture)
    this.gl.deleteFramebuffer(this.shadowFrameBuffer)
    this.gl.deleteProgram(this.mainProgram)
    this.gl.deleteProgram(this.shadowProgram)
  }

  private renderShadows(root: Node): void {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFrameBuffer)
    gl.viewport(0, 0, this.shadowSize, this.shadowSize)
    gl.clearDepth(1)
    gl.clear(gl.DEPTH_BUFFER_BIT)
    gl.useProgram(this.shadowProgram)
    gl.uniformMatrix4fv(this.shadowUniforms.lightMatrix, false, this.lightMatrix)
    this.drawShadowNode(root)
    gl.bindVertexArray(null)
  }

  private drawShadowNode(node: Node): void {
    if (!node.visible) {
      return
    }
    if (node.mesh && node.castShadow) {
      const gl = this.gl
      gl.uniformMatrix4fv(this.shadowUniforms.model, false, node.worldMatrix)
      node.mesh.draw()
    }
    for (const child of node.children) {
      this.drawShadowNode(child)
    }
  }

  private drawNode(node: Node, uniforms: MainUniforms): void {
    if (!node.visible) {
      return
    }
    if (node.mesh) {
      const gl = this.gl
      gl.uniformMatrix4fv(uniforms.model, false, node.worldMatrix)
      gl.uniformMatrix3fv(uniforms.normalMatrix, false, node.normalMatrix)
      gl.uniform3fv(uniforms.tint, [...node.tint])
      node.mesh.draw()
    }
    for (const child of node.children) {
      this.drawNode(child, uniforms)
    }
  }

  private updateLightMatrix(): void {
    const center = new Vec3(0, 1, -3)
    const eye = center.clone().subtract(this.lightDirection.clone().scale(24))
    lookAt(this.lightView, eye, center, Vec3.up())
    orthographic(this.lightProjection, -18, 18, -18, 18, 1, 52)
    multiplyMat4(this.lightMatrix, this.lightProjection, this.lightView)
  }

  private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
    const gl = this.gl
    const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource)
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource)
    const program = gl.createProgram()
    if (!program) {
      throw new Error('Unable to create WebGL program')
    }
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const information = gl.getProgramInfoLog(program) ?? 'Unknown link error'
      gl.deleteProgram(program)
      throw new Error(`WebGL program link failed: ${information}`)
    }
    return program
  }

  private createShader(type: number, source: string): WebGLShader {
    const gl = this.gl
    const shader = gl.createShader(type)
    if (!shader) {
      throw new Error('Unable to create WebGL shader')
    }
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const information = gl.getShaderInfoLog(shader) ?? 'Unknown compile error'
      gl.deleteShader(shader)
      throw new Error(`WebGL shader compilation failed: ${information}`)
    }
    return shader
  }

  private uniform(program: WebGLProgram, name: string): WebGLUniformLocation {
    const location = this.gl.getUniformLocation(program, name)
    if (!location) {
      throw new Error(`Unable to locate WebGL uniform ${name}`)
    }
    return location
  }
}
