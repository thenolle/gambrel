import { deflateSync } from 'node:zlib'

export type Color = readonly [number, number, number]

function byte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (const value of data) {
    crc ^= value
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) === 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const name = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  const checksum = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([length, name, data, checksum])
}

/**
 * Small RGB raster surface for build-generated artwork.
 * Coordinates use output pixels. Stroke and rounded-rectangle edges are antialiased.
 */
export class Raster {
  readonly width: number
  readonly height: number
  private readonly pixels: Buffer

  constructor(width: number, height: number) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 4096 || height > 4096) throw new RangeError('Raster dimensions must be integers between 1 and 4096')
    this.width = width
    this.height = height
    this.pixels = Buffer.alloc(width * height * 3)
  }

  background(colorAt: (x: number, y: number) => Color): void {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const color = colorAt(x, y)
        const offset = (y * this.width + x) * 3
        this.pixels[offset] = byte(color[0])
        this.pixels[offset + 1] = byte(color[1])
        this.pixels[offset + 2] = byte(color[2])
      }
    }
  }

  private blend(x: number, y: number, color: Color, alpha: number): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    const opacity = Math.max(0, Math.min(1, alpha))
    if (opacity === 0) return
    const offset = (y * this.width + x) * 3
    for (let channel = 0; channel < 3; channel += 1) {
      const previous = this.pixels[offset + channel] ?? 0
      const next = color[channel] ?? 0
      this.pixels[offset + channel] = byte(previous + (next - previous) * opacity)
    }
  }

  line(x1: number, y1: number, x2: number, y2: number, width: number, color: Color, opacity = 1): void {
    if (width <= 0) return
    const radius = width / 2
    const startX = Math.max(0, Math.floor(Math.min(x1, x2) - radius - 1))
    const endX = Math.min(this.width - 1, Math.ceil(Math.max(x1, x2) + radius + 1))
    const startY = Math.max(0, Math.floor(Math.min(y1, y2) - radius - 1))
    const endY = Math.min(this.height - 1, Math.ceil(Math.max(y1, y2) + radius + 1))
    const dx = x2 - x1
    const dy = y2 - y1
    const lengthSquared = dx * dx + dy * dy
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const px = x + .5
        const py = y + .5
        const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared))
        const distance = Math.hypot(px - (x1 + ratio * dx), py - (y1 + ratio * dy))
        const coverage = Math.max(0, Math.min(1, radius + .5 - distance))
        this.blend(x, y, color, coverage * opacity)
      }
    }
  }

  polyline(points: readonly (readonly [number, number])[], width: number, color: Color, opacity = 1): void {
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1]
      const current = points[index]
      if (previous === undefined || current === undefined) continue
      this.line(previous[0], previous[1], current[0], current[1], width, color, opacity)
    }
  }

  roundRect(x: number, y: number, width: number, height: number, radius: number, color: Color, opacity = 1): void {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2))
    const halfWidth = width / 2
    const halfHeight = height / 2
    const centerX = x + halfWidth
    const centerY = y + halfHeight
    const startX = Math.max(0, Math.floor(x - 1))
    const endX = Math.min(this.width - 1, Math.ceil(x + width + 1))
    const startY = Math.max(0, Math.floor(y - 1))
    const endY = Math.min(this.height - 1, Math.ceil(y + height + 1))
    for (let py = startY; py <= endY; py += 1) {
      for (let px = startX; px <= endX; px += 1) {
        const qx = Math.abs(px + .5 - centerX) - (halfWidth - r)
        const qy = Math.abs(py + .5 - centerY) - (halfHeight - r)
        const distance = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
        const coverage = Math.max(0, Math.min(1, .5 - distance))
        this.blend(px, py, color, coverage * opacity)
      }
    }
  }

  /**
   * Fills closed polygon contours using even-odd coverage.
   * Four vertical samples plus exact horizontal overlap provide antialiased edges.
   */
  fillContours(contours: readonly (readonly (readonly [number, number])[])[], color: Color): void {
    const points = contours.flat()
    if (points.length === 0) return
    const firstY = Math.max(0, Math.floor(Math.min(...points.map((point) => point[1]))))
    const lastY = Math.min(this.height - 1, Math.ceil(Math.max(...points.map((point) => point[1]))))
    const samples = 4
    for (let y = firstY; y <= lastY; y += 1) {
      const coverage = new Float32Array(this.width)
      for (let sample = 0; sample < samples; sample += 1) {
        const scanY = y + (sample + .5) / samples
        const intersections: number[] = []
        for (const contour of contours) {
          for (let index = 0; index < contour.length; index += 1) {
            const a = contour[index]
            const b = contour[(index + 1) % contour.length]
            if (a === undefined || b === undefined) continue
            if ((a[1] <= scanY && b[1] > scanY) || (b[1] <= scanY && a[1] > scanY)) intersections.push(a[0] + (scanY - a[1]) * (b[0] - a[0]) / (b[1] - a[1]))
          }
        }
        intersections.sort((a, b) => a - b)
        for (let index = 0; index + 1 < intersections.length; index += 2) {
          const left = intersections[index]
          const right = intersections[index + 1]
          if (left === undefined || right === undefined) continue
          const from = Math.max(0, Math.floor(left))
          const to = Math.min(this.width - 1, Math.floor(right))
          for (let x = from; x <= to; x += 1) {
            const overlap = Math.max(0, Math.min(x + 1, right) - Math.max(x, left))
            coverage[x] = (coverage[x] ?? 0) + overlap / samples
          }
        }
      }
      for (let x = 0; x < this.width; x += 1) this.blend(x, y, color, Math.min(1, coverage[x] ?? 0))
    }
  }

  png(): Buffer {
    const stride = this.width * 3
    const scanlines = Buffer.alloc((stride + 1) * this.height)
    for (let row = 0; row < this.height; row += 1) {
      const offset = row * (stride + 1)
      scanlines[offset] = 0
      this.pixels.copy(scanlines, offset + 1, row * stride, (row + 1) * stride)
    }
    const header = Buffer.alloc(13)
    header.writeUInt32BE(this.width, 0)
    header.writeUInt32BE(this.height, 4)
    header[8] = 8
    header[9] = 2
    return Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(scanlines, { level: 9 })),
      chunk('IEND', Buffer.alloc(0))
    ])
  }
}