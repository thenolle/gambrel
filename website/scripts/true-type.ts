import { Raster, type Color } from './raster.ts'

interface Point {
  readonly x: number
  readonly y: number
  readonly on: boolean
}

type Contour = readonly Point[]

interface Table {
  readonly offset: number
  readonly length: number
}

/**
 * TrueType glyf reader for trusted, committed font assets.
 * Does not execute font hinting instructions or implement complex-script shaping.
 */
export class TrueTypeFont {
  private readonly data: Buffer
  private readonly tables = new Map<string, Table>()
  private readonly contours = new Map<number, readonly Contour[]>()
  private readonly units: number
  private readonly longLocations: boolean
  private readonly metricCount: number
  private readonly glyphCount: number
  private readonly cmap: number
  private readonly cmapFormat: number

  constructor(data: Buffer) {
    this.data = data
    const count = data.readUInt16BE(4)
    for (let index = 0; index < count; index += 1) {
      const base = 12 + index * 16
      const name = data.toString('ascii', base, base + 4)
      const offset = data.readUInt32BE(base + 8)
      const length = data.readUInt32BE(base + 12)
      if (offset + length > data.length) throw new Error(`Invalid font table '${name}'`)
      this.tables.set(name, { offset, length })
    }
    const head = this.table('head')
    this.units = data.readUInt16BE(head + 18)
    this.longLocations = data.readInt16BE(head + 50) === 1
    this.metricCount = data.readUInt16BE(this.table('hhea') + 34)
    this.glyphCount = data.readUInt16BE(this.table('maxp') + 4)
    this.table('glyf')
    this.table('loca')
    this.table('hmtx')
    const cmap = this.table('cmap')
    const subtableCount = data.readUInt16BE(cmap + 2)
    let selected = -1
    let selectedFormat = 0
    let rank = -1
    for (let index = 0; index < subtableCount; index += 1) {
      const base = cmap + 4 + index * 8
      const platform = data.readUInt16BE(base)
      const offset = cmap + data.readUInt32BE(base + 4)
      const format = data.readUInt16BE(offset)
      if (platform !== 0 && platform !== 3) continue
      const nextRank = format === 12 ? 2 : format === 4 ? 1 : -1
      if (nextRank > rank) {
        selected = offset
        selectedFormat = format
        rank = nextRank
      }
    }
    if (selected < 0) throw new Error('Font has no supported Unicode cmap')
    this.cmap = selected
    this.cmapFormat = selectedFormat
  }

  private table(name: string): number {
    const entry = this.tables.get(name)
    if (entry === undefined) throw new Error(`Font requires the '${name}' table`)
    return entry.offset
  }

  private glyphFor(code: number): number {
    const data = this.data
    if (this.cmapFormat === 12) {
      const count = data.readUInt32BE(this.cmap + 12)
      let low = 0
      let high = count - 1
      while (low <= high) {
        const middle = (low + high) >>> 1
        const base = this.cmap + 16 + middle * 12
        const start = data.readUInt32BE(base)
        const end = data.readUInt32BE(base + 4)
        if (code < start) high = middle - 1
        else if (code > end) low = middle + 1
        else return data.readUInt32BE(base + 8) + code - start
      }
      return 0
    }
    if (code > 0xffff) return 0
    const count = data.readUInt16BE(this.cmap + 6) / 2
    const ends = this.cmap + 14
    const starts = ends + count * 2 + 2
    const deltas = starts + count * 2
    const ranges = deltas + count * 2
    for (let index = 0; index < count; index += 1) {
      const end = data.readUInt16BE(ends + index * 2)
      if (code > end) continue
      const start = data.readUInt16BE(starts + index * 2)
      if (code < start) return 0
      const delta = data.readInt16BE(deltas + index * 2)
      const rangePosition = ranges + index * 2
      const range = data.readUInt16BE(rangePosition)
      if (range === 0) return (code + delta) & 0xffff
      const glyph = data.readUInt16BE(rangePosition + range + (code - start) * 2)
      return glyph === 0 ? 0 : (glyph + delta) & 0xffff
    }
    return 0
  }

  private location(glyph: number): number {
    const loca = this.table('loca')
    return this.longLocations ? this.data.readUInt32BE(loca + glyph * 4) : this.data.readUInt16BE(loca + glyph * 2) * 2
  }

  private advance(glyph: number): number {
    return this.data.readUInt16BE(this.table('hmtx') + Math.min(glyph, this.metricCount - 1) * 4)
  }

  private outline(glyph: number, depth = 0): readonly Contour[] {
    if (depth > 16) throw new Error('Font composite nesting is too deep')
    if (glyph < 0 || glyph >= this.glyphCount) return []
    const cached = this.contours.get(glyph)
    if (cached !== undefined) return cached
    const start = this.location(glyph)
    const end = this.location(glyph + 1)
    if (start === end) return []
    const data = this.data
    const base = this.table('glyf') + start
    const count = data.readInt16BE(base)
    let cursor = base + 10
    const result: Point[][] = []
    if (count >= 0) {
      const ends: number[] = []
      for (let index = 0; index < count; index += 1) {
        ends.push(data.readUInt16BE(cursor))
        cursor += 2
      }
      const instructionLength = data.readUInt16BE(cursor)
      cursor += 2 + instructionLength
      const pointCount = (ends[ends.length - 1] ?? -1) + 1
      const flags: number[] = []
      while (flags.length < pointCount) {
        const flag = data[cursor++] ?? 0
        flags.push(flag)
        if ((flag & 8) !== 0) {
          const repeat = data[cursor++] ?? 0
          for (let index = 0; index < repeat; index += 1) flags.push(flag)
        }
      }
      const xs: number[] = []
      const ys: number[] = []
      let x = 0
      let y = 0
      for (const flag of flags) {
        if ((flag & 2) !== 0) {
          const change = data[cursor++] ?? 0
          x += (flag & 16) !== 0 ? change : -change
        } else if ((flag & 16) === 0) {
          x += data.readInt16BE(cursor)
          cursor += 2
        }
        xs.push(x)
      }
      for (const flag of flags) {
        if ((flag & 4) !== 0) {
          const change = data[cursor++] ?? 0
          y += (flag & 32) !== 0 ? change : -change
        } else if ((flag & 32) === 0) {
          y += data.readInt16BE(cursor)
          cursor += 2
        }
        ys.push(y)
      }
      let first = 0
      for (const last of ends) {
        const contour: Point[] = []
        for (let index = first; index <= last; index += 1) contour.push({ x: xs[index] ?? 0, y: ys[index] ?? 0, on: ((flags[index] ?? 0) & 1) !== 0 })
        result.push(contour)
        first = last + 1
      }
    } else {
      let more = true
      while (more) {
        const flags = data.readUInt16BE(cursor)
        const childGlyph = data.readUInt16BE(cursor + 2)
        cursor += 4
        const words = (flags & 1) !== 0
        const xy = (flags & 2) !== 0
        const arg1 = words ? xy ? data.readInt16BE(cursor) : data.readUInt16BE(cursor) : xy ? data.readInt8(cursor) : data.readUInt8(cursor)
        cursor += words ? 2 : 1
        const arg2 = words ? xy ? data.readInt16BE(cursor) : data.readUInt16BE(cursor) : xy ? data.readInt8(cursor) : data.readUInt8(cursor)
        cursor += words ? 2 : 1
        let a = 1
        let b = 0
        let c = 0
        let d = 1
        const fixed = (): number => {
          const value = data.readInt16BE(cursor) / 16384
          cursor += 2
          return value
        }
        if ((flags & 8) !== 0) a = d = fixed()
        else if ((flags & 64) !== 0) {
          a = fixed()
          d = fixed()
        } else if ((flags & 128) !== 0) {
          a = fixed()
          b = fixed()
          c = fixed()
          d = fixed()
        }
        const child = this.outline(childGlyph, depth + 1).map((contour) => contour.map((point): Point => ({ x: a * point.x + c * point.y, y: b * point.x + d * point.y, on: point.on })))
        let dx = xy ? arg1 : 0
        let dy = xy ? arg2 : 0
        if (xy && (flags & 2048) !== 0) {
          dx = a * arg1 + c * arg2
          dy = b * arg1 + d * arg2
        }
        if (!xy) {
          const parentPoint = result.flat()[arg1]
          const childPoint = child.flat()[arg2]
          if (parentPoint === undefined || childPoint === undefined) throw new Error('Invalid font component attachment')
          dx = parentPoint.x - childPoint.x
          dy = parentPoint.y - childPoint.y
        }
        for (const contour of child) result.push(contour.map((point) => ({ x: point.x + dx, y: point.y + dy, on: point.on })))
        more = (flags & 32) !== 0
      }
    }
    this.contours.set(glyph, result)
    return result
  }

  measure(text: string, size: number): number {
    let total = 0
    for (const character of text) total += this.advance(this.glyphFor(character.codePointAt(0) ?? 0))
    return total * size / this.units
  }

  draw(canvas: Raster, text: string, x: number, baseline: number, size: number, color: Color): void {
    const scale = size / this.units
    let pen = x
    for (const character of text) {
      const glyph = this.glyphFor(character.codePointAt(0) ?? 0)
      const outlines: Array<Array<readonly [number, number]>> = []
      for (const contour of this.outline(glyph)) {
        if (contour.length === 0) continue
        const expanded: Point[] = []
        for (let index = 0; index < contour.length; index += 1) {
          const point = contour[index]
          const next = contour[(index + 1) % contour.length]
          if (point === undefined || next === undefined) continue
          expanded.push(point)
          if (!point.on && !next.on) expanded.push({ x: (point.x + next.x) / 2, y: (point.y + next.y) / 2, on: true })
        }
        const start = expanded.findIndex((point) => point.on)
        if (start < 0) continue
        const ordered = [
          ...expanded.slice(start),
          ...expanded.slice(0, start)
        ]
        const first = ordered[0]
        if (first === undefined) continue
        const points: Array<readonly [number, number]> = []
        const emit = (point: Point): void => {
          points.push([pen + point.x * scale, baseline - point.y * scale])
        }
        let current = first
        emit(first)
        for (let index = 1; index <= ordered.length; index += 1) {
          const point = ordered[index % ordered.length]
          if (point === undefined) continue
          if (point.on) {
            emit(point)
            current = point
          } else {
            const end = ordered[(index + 1) % ordered.length]
            if (end === undefined) continue
            const steps = Math.max(4, Math.min(24, Math.ceil(Math.hypot(end.x - current.x, end.y - current.y) * scale / 3)))
            for (let step = 1; step <= steps; step += 1) {
              const t = step / steps
              const u = 1 - t
              emit({ x: u * u * current.x + 2 * u * t * point.x + t * t * end.x, y: u * u * current.y + 2 * u * t * point.y + t * t * end.y, on: true })
            }
            current = end
            index += 1
          }
        }
        outlines.push(points)
      }
      canvas.fillContours(outlines, color)
      pen += this.advance(glyph) * scale
    }
  }
}

export function wrapFontText(font: TrueTypeFont, text: string, size: number, width: number, limit: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    for (const character of `${line === '' ? '' : ' '}${word}`) {
      if (font.measure(line + character, size) > width && line !== '') {
        lines.push(line.trimEnd())
        line = character.trimStart()
      } else line += character
    }
  }
  if (line !== '') lines.push(line)
  if (lines.length <= limit) return lines
  const visible = lines.slice(0, limit)
  let last = visible[limit - 1] ?? ''
  while (last !== '' && font.measure(`${last}…`, size) > width) last = last.slice(0, -1)
  visible[limit - 1] = `${last}…`
  return visible
}