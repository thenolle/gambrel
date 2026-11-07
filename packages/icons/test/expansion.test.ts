import { describe, expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { renderToString } from '@gambrel/view'
import { parseSvg, toPascalCase } from '../scripts/lib.ts'
import { iconNames } from '../src/generated/names.ts'
import * as components from '../src/generated/icons.ts'
import type { IconComponent } from '../src/types.ts'

const categories: Readonly<Record<string, readonly string[]>> = {
  development: [
    'file-plus', 'file-minus', 'file-check', 'file-search',
    'file-download', 'file-upload', 'folder-open', 'folder-plus',
    'folder-check', 'git-merge', 'git-pull-request',
    'terminal-square', 'code-square'
  ],
  navigation: [
    'panel-right', 'panel-top', 'panel-bottom', 'layout-rows',
    'layout-grid', 'corner-up-left', 'corner-up-right',
    'corner-down-left', 'corner-down-right',
    'move-horizontal', 'move-vertical', 'arrow-down-right', 'arrow-up-left'
  ],
  editing: [
    'clipboard-check', 'clipboard-list', 'list-ordered', 'list-checks',
    'text-cursor', 'text-select', 'eraser', 'scissors', 'paintbrush',
    'palette', 'undo', 'redo', 'spell-check'
  ],
  communication: [
    'message-circle', 'message-circle-more', 'messages-square',
    'mail-open', 'mail-check', 'mail-plus', 'phone', 'phone-incoming',
    'phone-outgoing', 'megaphone', 'inbox', 'rss', 'contact'
  ],
  media: [
    'camera', 'camera-off', 'video', 'video-off', 'music', 'headphones',
    'film', 'subtitles', 'repeat', 'shuffle', 'rewind',
    'fast-forward', 'image-plus'
  ],
  commerce: [
    'receipt', 'wallet', 'store', 'shopping-bag', 'basket', 'truck',
    'gift', 'coins', 'banknote', 'percent', 'barcode', 'ticket', 'building'
  ],
  status: [
    'circle-minus', 'circle-plus', 'circle-pause', 'circle-play',
    'circle-stop', 'badge-check', 'badge-alert', 'timer', 'hourglass',
    'flag-triangle', 'thumbs-up', 'thumbs-down', 'bell-off'
  ],
  devices: [
    'laptop', 'tablet', 'keyboard', 'mouse', 'printer', 'router',
    'bluetooth', 'plug', 'unplug', 'usb', 'hard-drive',
    'battery', 'battery-charging'
  ]
}

describe('expanded icon coverage', () => {
  test('covers eight categories with thirteen unique icons each', () => {
    const names = Object.values(categories).flat()
    expect(Object.keys(categories).length).toBe(8)
    expect(names.length).toBe(104)
    expect(new Set(names).size).toBe(104)

    for (const list of Object.values(categories)) {
      expect(list.length).toBe(13)
    }

    const shipped = new Set<string>(iconNames)
    for (const name of names) expect(shipped.has(name), name).toBe(true)
  })

  test('every expansion SVG validates and its component renders', async () => {
    const exports = components as Readonly<Record<string, IconComponent>>

    for (const name of Object.values(categories).flat()) {
      const source = await readFile(
        join(import.meta.dir, '..', 'svg', `${name}.svg`),
        'utf8'
      )
      expect(parseSvg(name, source).length, name).toBeGreaterThan(0)

      const component = exports[toPascalCase(name)]
      if (component === undefined) throw new Error(`Missing export for ${name}`)

      const html = await renderToString(component({ size: 20, title: name }))
      expect(html, name).toContain('width="20"')
      expect(html, name).toContain(`gb-icon-${name}`)
      expect(html, name).toContain('role="img"')
      expect(html, name).not.toContain('<script')
    }
  })
})