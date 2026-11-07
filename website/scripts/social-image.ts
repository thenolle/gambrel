import { deflateSync } from 'node:zlib'

const FONT: Readonly<Record<string, string>> = {
  A: '01110/10001/10001/11111/10001/10001/10001',
  B: '11110/10001/10001/11110/10001/10001/11110',
  C: '01111/10000/10000/10000/10000/10000/01111',
  D: '11110/10001/10001/10001/10001/10001/11110',
  E: '11111/10000/10000/11110/10000/10000/11111',
  F: '11111/10000/10000/11110/10000/10000/10000',
  G: '01111/10000/10000/10111/10001/10001/01111',
  H: '10001/10001/10001/11111/10001/10001/10001',
  I: '11111/00100/00100/00100/00100/00100/11111',
  J: '00111/00010/00010/00010/10010/10010/01100',
  K: '10001/10010/10100/11000/10100/10010/10001',
  L: '10000/10000/10000/10000/10000/10000/11111',
  M: '10001/11011/10101/10101/10001/10001/10001',
  N: '10001/11001/10101/10011/10001/10001/10001',
  O: '01110/10001/10001/10001/10001/10001/01110',
  P: '11110/10001/10001/11110/10000/10000/10000',
  Q: '01110/10001/10001/10001/10101/10010/01101',
  R: '11110/10001/10001/11110/10100/10010/10001',
  S: '01111/10000/10000/01110/00001/00001/11110',
  T: '11111/00100/00100/00100/00100/00100/00100',
  U: '10001/10001/10001/10001/10001/10001/01110',
  V: '10001/10001/10001/10001/10001/01010/00100',
  W: '10001/10001/10001/10101/10101/10101/01010',
  X: '10001/10001/01010/00100/01010/10001/10001',
  Y: '10001/10001/01010/00100/00100/00100/00100',
  Z: '11111/00001/00010/00100/01000/10000/11111',
  '0': '01110/10001/10011/10101/11001/10001/01110',
  '1': '00100/01100/00100/00100/00100/00100/01110',
  '2': '01110/10001/00001/00010/00100/01000/11111',
  '3': '11110/00001/00001/01110/00001/00001/11110',
  '4': '00010/00110/01010/10010/11111/00010/00010',
  '5': '11111/10000/10000/11110/00001/00001/11110',
  '6': '01110/10000/10000/11110/10001/10001/01110',
  '7': '11111/00001/00010/00100/01000/01000/01000',
  '8': '01110/10001/10001/01110/10001/10001/01110',
  '9': '01110/10001/10001/01111/00001/00001/01110'
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of data) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) === 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const name = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([length, name, data, crc])
}

export function socialImage(title: string): Buffer {
  const width = 1200
  const height = 630
  const pixels = Buffer.alloc(width * height * 3)
  const rect = (x: number, y: number, w: number, h: number, color: readonly number[]): void => {
    for (let py = Math.max(0, y); py < Math.min(height, y + h); py += 1) {
      for (let px = Math.max(0, x); px < Math.min(width, x + w); px += 1) {
        const offset = (py * width + px) * 3
        pixels[offset] = color[0] ?? 0
        pixels[offset + 1] = color[1] ?? 0
        pixels[offset + 2] = color[2] ?? 0
      }
    }
  }
  const text = (value: string, x: number, y: number, scale: number, color: readonly number[]): void => {
    Array.from(value).forEach((character, index) => {
      const glyph = FONT[character]
      if (glyph === undefined) return
      glyph.split('/').forEach((row, rowIndex) => {
        Array.from(row).forEach((cell, column) => {
          if (cell === '1') rect(x + index * 6 * scale + column * scale, y + rowIndex * scale, scale, scale, color)
        })
      })
    })
  }
  const line = (x1: number, y1: number, x2: number, y2: number): void => {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))
    for (let index = 0; index <= steps; index += 1) {
      const ratio = steps === 0 ? 0 : index / steps
      rect(Math.round(x1 + (x2 - x1) * ratio) - 4, Math.round(y1 + (y2 - y1) * ratio) - 4, 8, 8, [250, 250, 250])
    }
  }
  rect(0, 0, width, height, [12, 12, 16])
  rect(0, 0, 12, height, [139, 120, 255])
  rect(48, 48, 1104, 534, [24, 24, 30])
  line(82, 170, 110, 112)
  line(110, 112, 154, 80)
  line(154, 80, 198, 112)
  line(198, 112, 226, 170)
  line(108, 158, 108, 220)
  line(108, 220, 204, 220)
  line(204, 220, 204, 158)
  line(204, 158, 154, 158)
  text('GAMBREL', 270, 108, 10, [250, 250, 250])
  text('DOCUMENTATION', 274, 198, 3, [172, 172, 190])
  const normalized = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  const lines: string[] = []
  let current = ''
  for (const word of normalized.split(' ')) {
    const next = current === '' ? word : `${current} ${word}`
    if (next.length > 28 && current !== '') {
      lines.push(current)
      current = word
    } else current = next
  }
  if (current !== '') lines.push(current)
  lines.slice(0, 3).forEach((value, index) => {
    text(value.slice(0, 28), 88, 325 + index * 65, 6, [230, 230, 240])
  })
  const stride = width * 3
  const scanlines = Buffer.alloc((stride + 1) * height)
  for (let row = 0; row < height; row += 1) {
    scanlines[row * (stride + 1)] = 0
    pixels.copy(scanlines, row * (stride + 1) + 1, row * stride, (row + 1) * stride)
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 2
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(scanlines)),
    chunk('IEND', Buffer.alloc(0))
  ])
}