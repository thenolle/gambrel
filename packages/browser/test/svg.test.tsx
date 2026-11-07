/** @jsxImportSource @gambrel/view */
import { describe, expect, test } from 'bun:test'
import { signal } from '@gambrel/reactivity'
import { renderToString } from '@gambrel/view'
import { hydrate, mount, type HydrationMismatch } from '../src/index.ts'
import { createDom } from './dom.ts'

const SVG = 'http://www.w3.org/2000/svg'
const HTML = 'http://www.w3.org/1999/xhtml'

describe('SVG support', () => {
  test('svg and its children are created in the SVG namespace', () => {
    const dom = createDom()
    mount(
      dom.container,
      <svg viewBox="0 0 24 24">
        <path d="M0 0h24" />
      </svg>
    )
    expect(dom.query('svg').namespaceURI).toBe(SVG)
    expect(dom.query('path').namespaceURI).toBe(SVG)
    expect(dom.query('svg').getAttribute('viewBox')).toBe('0 0 24 24')
  })

  test('children of foreignObject are HTML again', () => {
    const dom = createDom()
    mount(
      dom.container,
      <svg>
        <foreignObject>
          <p>text</p>
        </foreignObject>
      </svg>
    )
    expect(dom.query('p').namespaceURI).toBe(HTML)
  })

  test('a reactive region inside an svg keeps the namespace', () => {
    const dom = createDom()
    const on = signal(false)
    mount(dom.container, <svg>{() => (on() ? <circle cx="12" cy="12" r="4" /> : null)}</svg>)
    on.set(true)
    expect(dom.query('circle').namespaceURI).toBe(SVG)
  })

  test('server-rendered svg hydrates without mismatches', async () => {
    const tree = (
      <svg viewBox="0 0 24 24">
        <path d="M0 0h24" />
      </svg>
    )
    const dom = createDom(await renderToString(tree))
    const svg = dom.query('svg')
    const found: HydrationMismatch[] = []
    hydrate(dom.container, tree, { onMismatch: (mismatch) => void found.push(mismatch) })
    expect(found).toEqual([])
    expect(dom.query('svg')).toBe(svg)
  })
})