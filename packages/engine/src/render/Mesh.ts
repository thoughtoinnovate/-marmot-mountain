import type { GeometryData } from './Geometry'

export class Mesh {
  readonly vertexArray: WebGLVertexArrayObject
  readonly count: number
  private readonly positionBuffer: WebGLBuffer
  private readonly normalBuffer: WebGLBuffer
  private readonly colorBuffer: WebGLBuffer

  constructor(
    private readonly gl: WebGL2RenderingContext,
    geometry: GeometryData,
  ) {
    const vertexArray = gl.createVertexArray()
    const positionBuffer = gl.createBuffer()
    const normalBuffer = gl.createBuffer()
    const colorBuffer = gl.createBuffer()
    if (!vertexArray || !positionBuffer || !normalBuffer || !colorBuffer) {
      throw new Error('Unable to allocate WebGL mesh resources')
    }
    this.vertexArray = vertexArray
    this.positionBuffer = positionBuffer
    this.normalBuffer = normalBuffer
    this.colorBuffer = colorBuffer
    this.count = geometry.positions.length / 3

    gl.bindVertexArray(vertexArray)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.positions), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.normals), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(geometry.colors), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(2)
    gl.vertexAttribPointer(2, 3, gl.UNSIGNED_BYTE, true, 0, 0)

    gl.bindVertexArray(null)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
  }

  draw(): void {
    this.gl.bindVertexArray(this.vertexArray)
    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.count)
  }

  destroy(): void {
    this.gl.deleteBuffer(this.positionBuffer)
    this.gl.deleteBuffer(this.normalBuffer)
    this.gl.deleteBuffer(this.colorBuffer)
    this.gl.deleteVertexArray(this.vertexArray)
  }
}
