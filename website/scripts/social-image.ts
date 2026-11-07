import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Raster, type Color } from './raster.ts'
import { TrueTypeFont, wrapFontText } from './true-type.ts'

const INK: Color = [28, 29, 31]
const MUTED: Color = [100, 102, 106]
let regularFont: TrueTypeFont | undefined
let boldFont: TrueTypeFont | undefined

export function fonts(): { regular: TrueTypeFont; bold: TrueTypeFont } {
  const directory = join(import.meta.dir, '..', 'assets', 'fonts')
  regularFont ??= new TrueTypeFont(readFileSync(join(directory, 'AtkinsonHyperlegible-Regular.ttf')))
  boldFont ??= new TrueTypeFont(readFileSync(join(directory, 'AtkinsonHyperlegible-Bold.ttf')))
  return { regular: regularFont, bold: boldFont }
}

export function drawBrand(canvas: Raster, x: number, y: number, size: number, color: Color): void {
  const s = size / 24
  const paths: readonly (readonly (readonly [number, number])[])[] = [
    [[2.5, 14.5], [6, 7.8], [12, 3.5], [18, 7.8], [21.5, 14.5]],
    [[5.5, 12.5], [5.5, 21], [18.5, 21], [18.5, 12.5]],
    [[10, 21], [10, 15.5], [14, 15.5], [14, 21]]
  ]
  for (const path of paths) canvas.polyline(path.map(([px, py]) => [x + px * s, y + py * s] as const), size * .065, color)
  for (const px of [8, 16]) canvas.line(x + px * s, y + 15 * s, x + px * s, y + 15 * s, size * .065, color)
}

export function socialImage(title: string, description = 'Guides and reference for building with Gambrel.', section = 'Documentation'): Buffer {
  const canvas = new Raster(1200, 630)
  const { regular, bold } = fonts()
  canvas.background(() => [249, 249, 247])
  drawBrand(canvas, 64, 51, 46, INK)
  bold.draw(canvas, 'Gambrel', 126, 87, 30, INK)
  regular.draw(canvas, section, 69, 162, 20, MUTED)
  let size = 68
  let lines = wrapFontText(bold, title, size, 1056, 3)
  if (lines.length === 3) {
    size = 58
    lines = wrapFontText(bold, title, size, 1056, 3)
  }
  lines.forEach((line, index) => {
    bold.draw(canvas, line, 68, 256 + index * (size + 10), size, INK)
  })
  const descriptionTop = Math.max(388, 256 + (lines.length - 1) * (size + 10) + 54)
  wrapFontText(regular, description, 25, 1010, 2).forEach((line, index) => {
    regular.draw(canvas, line, 70, descriptionTop + index * 34, 25, MUTED)
  })
  canvas.line(68, 548, 1132, 548, 1, [220, 220, 216])
  regular.draw(canvas, 'TypeScript · JSX · Bun', 70, 586, 19, MUTED)
  const address = 'Gambrel documentation'
  regular.draw(canvas, address, 1130 - regular.measure(address, 19), 586, 19, MUTED)
  return canvas.png()
}

export function appIcon(size: number): Buffer {
  const canvas = new Raster(size, size)
  canvas.background(() => INK)
  const markSize = size * .57
  drawBrand(canvas, (size - markSize) / 2, (size - markSize) / 2, markSize, [250, 250, 248])
  return canvas.png()
}