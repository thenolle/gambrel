import { Raster, type Color } from './raster.ts'

const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  A: ['0,10 3,0 6,10', '1.2,6 4.8,6'],
  B: ['0,10 0,0 4,0 6,1.5 6,3.5 4,5 0,5', '4,5 6,6.5 6,8.5 4,10 0,10'],
  C: ['6,1 4.5,0 1.5,0 0,1.5 0,8.5 1.5,10 4.5,10 6,9'],
  D: ['0,10 0,0 3.5,0 6,2.5 6,7.5 3.5,10 0,10'],
  E: ['6,0 0,0 0,10 6,10', '0,5 5,5'],
  F: ['6,0 0,0 0,10', '0,5 5,5'],
  G: ['6,1 4.5,0 1.5,0 0,1.5 0,8.5 1.5,10 4.5,10 6,8.5 6,5.5 3.5,5.5'],
  H: ['0,0 0,10', '6,0 6,10', '0,5 6,5'],
  I: ['1,0 5,0', '3,0 3,10', '1,10 5,10'],
  J: ['1,0 6,0 6,8 4,10 2,10 0,8'],
  K: ['0,0 0,10', '6,0 0,6', '2.5,3.5 6,10'],
  L: ['0,0 0,10 6,10'],
  M: ['0,10 0,0 3,5 6,0 6,10'],
  N: ['0,10 0,0 6,10 6,0'],
  O: ['1.5,0 4.5,0 6,1.5 6,8.5 4.5,10 1.5,10 0,8.5 0,1.5 1.5,0'],
  P: ['0,10 0,0 4,0 6,1.5 6,3.5 4,5 0,5'],
  Q: ['1.5,0 4.5,0 6,1.5 6,8.5 4.5,10 1.5,10 0,8.5 0,1.5 1.5,0', '3.5,7 6.5,10.5'],
  R: ['0,10 0,0 4,0 6,1.5 6,3.5 4,5 0,5', '3,5 6,10'],
  S: ['6,1 4.5,0 1.5,0 0,1.5 0,3.5 1.5,5 4.5,5 6,6.5 6,8.5 4.5,10 1.5,10 0,9'],
  T: ['0,0 6,0', '3,0 3,10'],
  U: ['0,0 0,8.5 1.5,10 4.5,10 6,8.5 6,0'],
  V: ['0,0 3,10 6,0'],
  W: ['0,0 1,10 3,6 5,10 6,0'],
  X: ['0,0 6,10', '6,0 0,10'],
  Y: ['0,0 3,5 6,0', '3,5 3,10'],
  Z: ['0,0 6,0 0,10 6,10'],
  '0': ['1.5,0 4.5,0 6,2 6,8 4.5,10 1.5,10 0,8 0,2 1.5,0', '1,8 5,2'],
  '1': ['1,2 3,0 3,10', '1,10 5,10'],
  '2': ['0,1.5 1.5,0 4.5,0 6,1.5 6,3 0,10 6,10'],
  '3': ['0,0 6,0 3,5 5,5 6,6.5 6,8.5 4.5,10 1,10 0,9'],
  '4': ['5,10 5,0 0,7 6,7'],
  '5': ['6,0 0,0 0,5 4.5,5 6,6.5 6,8.5 4.5,10 0,10'],
  '6': ['6,1 4.5,0 1.5,0 0,2 0,8.5 1.5,10 4.5,10 6,8.5 6,6.5 4.5,5 0,5'],
  '7': ['0,0 6,0 1.5,10'],
  '8': ['1.5,0 4.5,0 6,1.5 6,3.5 4.5,5 1.5,5 0,3.5 0,1.5 1.5,0', '1.5,5 0,6.5 0,8.5 1.5,10 4.5,10 6,8.5 6,6.5 4.5,5'],
  '9': ['6,5 1.5,5 0,3.5 0,1.5 1.5,0 4.5,0 6,1.5 6,8 4.5,10 1,10'],
  '-': ['1,5 5,5'],
  '.': ['3,10 3,10'],
  ':': ['3,3 3,3', '3,8 3,8'],
  '/': ['0,10 6,0'],
  '@': ['5,8 5,3 2,3 1,4 1,7 2,8 5,8 7,7 7,2 5,0 1,0 -1,2 -1,9 1,11 6,11'],
  '&': ['6,10 1,3 1,1 2,0 4,0 5,1 5,3 0,7 0,9 1,10 4,10 6,7'],
  '?': ['0,1 1,0 5,0 6,1 6,3 3,6 3,7', '3,10 3,10'],
  '+': ['0,5 6,5', '3,2 3,8'],
  '(': ['4,0 2,2 1,5 2,8 4,10'],
  ')': ['2,0 4,2 5,5 4,8 2,10'],
  "'": ['3,0 2,3']
}

export function artworkText(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[–—]/g, '-').replace(/[“”]/g, "'").replace(/[‘’]/g, "'").toUpperCase().replace(/\s+/g, ' ').trim()
}

export function measureText(value: string, size: number): number {
  const length = Array.from(value).length
  return length === 0 ? 0 : (length - 1) * size * .8 + size * .6
}

export function drawText(canvas: Raster, value: string, x: number, y: number, size: number, color: Color, weight = .1): void {
  const scale = size / 10
  Array.from(artworkText(value)).forEach((character, index) => {
    if (character === ' ') return
    const paths = GLYPHS[character] ?? GLYPHS['?'] ?? []
    for (const path of paths) {
      const points = path.split(' ').map((pair): readonly [number, number] => {
        const [px = '0', py = '0'] = pair.split(',')
        return [x + index * size * .8 + Number(px) * scale, y + Number(py) * scale]
      })
      canvas.polyline(points, Math.max(.9, size * weight), color)
    }
  })
}

export function wrapText(value: string, size: number, width: number, maxLines: number): string[] {
  const source = artworkText(value)
  const capacity = Math.max(1, Math.floor(width / (size * .8)))
  const pieces = source.split(' ').flatMap((word) => {
    if (word.length <= capacity) return [word]
    const chunks: string[] = []
    for (let index = 0; index < word.length; index += capacity) chunks.push(word.slice(index, index + capacity))
    return chunks
  })
  const lines: string[] = []
  let current = ''
  for (const piece of pieces) {
    const next = current === '' ? piece : `${current} ${piece}`
    if (measureText(next, size) > width && current !== '') {
      lines.push(current)
      current = piece
    } else current = next
  }
  if (current !== '') lines.push(current)
  if (lines.length <= maxLines) return lines
  const visible = lines.slice(0, maxLines)
  const last = visible[maxLines - 1] ?? ''
  let abbreviated = last
  while (abbreviated.length > 0 && measureText(`${abbreviated}...`, size) > width) abbreviated = abbreviated.slice(0, -1)
  visible[maxLines - 1] = `${abbreviated}...`
  return visible
}