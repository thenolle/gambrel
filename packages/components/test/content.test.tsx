/** @jsxImportSource @gambrel/view */
import { describe, expect, test } from 'bun:test'
import { hydrate, mount, type HydrationMismatch } from '@gambrel/browser'
import { signal } from '@gambrel/reactivity'
import { renderToString } from '@gambrel/view'
import {
  CharacterCount,
  CodeBlock,
  CopyButton,
  Disclosure,
  Meter,
  StatusBadge,
  Timeline,
  VisuallyHidden
} from '../src/index.ts'
import { createDom } from './dom.ts'

describe('content components', () => {
  test('CodeBlock escapes source and never interprets HTML', async () => {
    const html = await renderToString(
      <CodeBlock code={'<script>alert("x")</script>'} language="html" title="Example" />
    )
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
    expect(html).toContain('Example')
  })

  test('CharacterCount tracks code points and reports over-limit state', () => {
    const dom = createDom()
    const value = signal('a')
    mount(dom.container, <CharacterCount value={value} max={2} />)
    expect(dom.container.textContent).toBe('1 / 2')

    value.set('a😀b')
    expect(dom.container.textContent).toBe('3 / 2')
    expect(dom.query('span').getAttribute('data-over-limit')).toBe('true')
  })

  test('Meter validates and clamps values', async () => {
    expect(await renderToString(<Meter label="Storage" value={150} />)).toContain('value="100"')
    expect(() => Meter({ label: 'Bad', value: 1, min: 2, max: 1 })).toThrow('finite bounds')
  })

  test('StatusBadge retains visible status text', async () => {
    const html = await renderToString(<StatusBadge tone="success">Healthy</StatusBadge>)
    expect(html).toContain('gb-status-success')
    expect(html).toContain('Healthy')
    expect(html).toContain('aria-hidden="true"')
  })

  test('Timeline renders supplied dates without locale formatting', async () => {
    const html = await renderToString(
      <Timeline items={[
        { value: 'release', title: 'Released', dateTime: '2026-11-07', dateLabel: '7 November 2026' }
      ]} />
    )
    expect(html).toContain('datetime="2026-11-07"')
    expect(html).toContain('7 November 2026')
  })

  test('Disclosure uses native details and rejects controlled open', async () => {
    expect(await renderToString(
      <Disclosure summary="Details" defaultOpen>Content</Disclosure>
    )).toContain('<details open')

    expect(() => Disclosure({ summary: 'Details', open: true })).toThrow('defaultOpen')
  })

  test('VisuallyHidden preserves its contents', async () => {
    expect(await renderToString(<VisuallyHidden>Additional context</VisuallyHidden>)).toBe(
      '<span class="gb-visually-hidden">Additional context</span>'
    )
  })
})

describe('copy interaction', () => {
  test('copies through the owning document clipboard', async () => {
    const dom = createDom()
    const view = dom.document.defaultView
    if (view === null) throw new Error('Missing test window')

    const copied: string[] = []
    Object.defineProperty(view.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          copied.push(text)
        }
      }
    })

    const root = mount(dom.container, <CopyButton text="hello" />)
    dom.click(dom.query('button'))
    await Promise.resolve()
    await Promise.resolve()

    expect(copied).toEqual(['hello'])
    expect(dom.query('button').textContent).toBe('Copied')
    root.dispose()
  })

  test('reports a clipboard failure without throwing from the event handler', async () => {
    const dom = createDom()
    const view = dom.document.defaultView
    if (view === null) throw new Error('Missing test window')

    Object.defineProperty(view.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error('Denied')
        }
      }
    })

    const failures: unknown[] = []
    const root = mount(
      dom.container,
      <CopyButton text="hello" onCopyError={(error) => void failures.push(error)} />
    )
    dom.click(dom.query('button'))
    await Promise.resolve()
    await Promise.resolve()

    expect(failures.length).toBe(1)
    expect(dom.query('button').textContent).toBe('Copy failed')
    root.dispose()
  })
})

test('content components hydrate without mismatches', async () => {
  const tree = (
    <div>
      <CodeBlock code="const answer = 42" language="ts" />
      <CharacterCount value="Hello" max={10} />
      <Meter label="Capacity" value={40} />
      <StatusBadge tone="info">Available</StatusBadge>
      <Timeline items={[{ value: 'created', title: 'Created' }]} />
      <Disclosure summary="Read more">Details</Disclosure>
      <VisuallyHidden>Context</VisuallyHidden>
    </div>
  )

  const dom = createDom(await renderToString(tree))
  const mismatches: HydrationMismatch[] = []
  const root = hydrate(dom.container, tree, {
    onMismatch: (mismatch) => void mismatches.push(mismatch)
  })

  expect(mismatches).toEqual([])
  root.dispose()
})