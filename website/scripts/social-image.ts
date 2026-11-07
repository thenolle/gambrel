import { createHash } from 'node:crypto'
import { Raster, type Color } from './raster.ts'
import { drawText, measureText, wrapText } from './vector-type.ts'

const WHITE: Color = [244, 244, 250]
const MUTED: Color = [160, 159, 180]
const VIOLET: Color = [177, 157, 255]

export function drawBrand(canvas: Raster, x: number, y: number, size: number, color: Color, opacity = 1): void {
  const s = size / 24
  const paths: readonly (readonly (readonly [number, number])[])[] = [
    [[2.5, 14.5], [6, 7.8], [12, 3.5], [18, 7.8], [21.5, 14.5]],
    [[5.5, 12.5], [5.5, 21], [18.5, 21], [18.5, 12.5]],
    [[10, 21], [10, 15.5], [14, 15.5], [14, 21]]
  ]
  for (const path of paths) canvas.polyline(path.map(([px, py]) => [x + px * s, y + py * s] as const), size * .065, color, opacity)
  for (const px of [8, 16]) canvas.line(x + px * s, y + 15 * s, x + px * s, y + 15 * s, size * .065, color, opacity)
}

function accentFor(title: string): Color {
  const digest = createHash('sha256').update(title).digest()
  const palettes: readonly Color[] = [
    [139, 120, 246],
    [82, 154, 232],
    [61, 170, 160],
    [180, 113, 217]
  ]
  return palettes[(digest[0] ?? 0) % palettes.length] ?? VIOLET
}

/**
 * Deterministic PNG sharing artwork, rendered entirely in TypeScript.
 */
export function socialImage(title: string, description = 'TypeScript. JSX. Explicit server and browser boundaries.', section = 'Documentation'): Buffer {
  const canvas = new Raster(1200, 630)
  const accent = accentFor(title)
  canvas.background((x, y): Color => {
    const purple = Math.exp(-(((x - 1120) / 620) ** 2 + ((y - 60) / 420) ** 2))
    const teal = Math.exp(-(((x - 80) / 600) ** 2 + ((y - 650) / 360) ** 2))
    return [
      10 + accent[0] * purple * .14 + teal * 3,
      11 + accent[1] * purple * .12 + teal * 18,
      17 + accent[2] * purple * .16 + teal * 22
    ]
  })
  for (let x = 0; x < 1200; x += 48) canvas.line(x, 0, x, 630, .7, [118, 118, 145], .09)
  for (let y = 0; y < 630; y += 48) canvas.line(0, y, 1200, y, .7, [118, 118, 145], .09)
  canvas.roundRect(24, 24, 1152, 582, 28, [91, 91, 119], .28)
  canvas.roundRect(25, 25, 1150, 580, 27, [12, 13, 20], .87)
  canvas.roundRect(25, 25, 7, 580, 3, accent, .9)
  canvas.roundRect(64, 60, 64, 64, 17, accent, .16)
  drawBrand(canvas, 72, 68, 48, WHITE)
  drawText(canvas, 'GAMBREL', 150, 77, 28, WHITE, .095)
  drawText(canvas, 'DOCUMENTATION', 151, 113, 10, MUTED, .085)
  const sectionText = wrapText(section, 12, 280, 1)[0] ?? 'DOCUMENTATION'
  const sectionWidth = Math.max(100, measureText(sectionText, 12) + 34)
  canvas.roundRect(1132 - sectionWidth, 73, sectionWidth, 35, 17, accent, .12)
  drawText(canvas, sectionText, 1149 - sectionWidth, 85, 12, VIOLET, .09)
  drawBrand(canvas, 945, 250, 225, accent, .09)
  drawText(canvas, 'BUILD WITH CLARITY', 70, 178, 12, VIOLET, .09)
  let titleSize = 60
  let titleLines = wrapText(title, titleSize, 1030, 3)
  if (titleLines.length === 3) {
    titleSize = 52
    titleLines = wrapText(title, titleSize, 1030, 3)
  }
  titleLines.forEach((line, index) => {
    drawText(canvas, line, 72, 226 + index * (titleSize + 20), titleSize, WHITE, .105)
  })
  const descriptionY = Math.max(422, 226 + titleLines.length * (titleSize + 20) + 6)
  wrapText(description, 17, 1000, 2).forEach((line, index) => {
    drawText(canvas, line, 72, descriptionY + index * 29, 17, MUTED, .075)
  })
  canvas.line(72, 550, 1128, 550, 1, [72, 72, 92], .7)
  canvas.line(72, 581, 98, 581, 2, accent)
  drawText(canvas, 'TYPESCRIPT / JSX / BUN', 113, 575, 11, MUTED, .08)
  drawText(canvas, 'GAMBREL DOCS', 947, 575, 11, MUTED, .08)
  return canvas.png()
}

/**
 * Full-bleed application icon, with the mark inside a maskable safe area.
 */
export function appIcon(size: number): Buffer {
  const canvas = new Raster(size, size)
  canvas.background((x, y): Color => {
    const glow = Math.max(0, 1 - Math.hypot(x - size * .8, y - size * .1) / size)
    return [22 + glow * 12, 22 + glow * 8, 28 + glow * 25]
  })
  const markSize = size * .58
  drawBrand(canvas, (size - markSize) / 2, (size - markSize) / 2, markSize, WHITE)
  return canvas.png()
}