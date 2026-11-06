/** @jsxImportSource @gambrel/view */
import { describe, expect, test } from 'bun:test'
import { signal } from '@gambrel/reactivity'
import { renderToString, type Child } from '@gambrel/view'
import { hydrate, type HydrationMismatch } from '../src/index.ts'
import { createDom } from './dom.ts'

function Counter(props: { initial: number }): Child {
  const count = signal(props.initial)
  return (
    <button type="button" onClick={() => count.update((n) => n + 1)}>
      Clicked {count} times
    </button>
  )
}

function collect(): { readonly found: HydrationMismatch[]; readonly onMismatch: (m: HydrationMismatch) => void } {
  const found: HydrationMismatch[] = []
  return { found, onMismatch: (m) => void found.push(m) }
}

describe('hydrate matching markup', () => {
  test('preserves server DOM and makes it interactive', async () => {
    const tree = (
      <main>
        <h1>Title</h1>
        <Counter initial={3} />
      </main>
    )
    const dom = createDom(await renderToString(tree))
    const main = dom.query('main')
    const button = dom.query('button')
    const { found, onMismatch } = collect()
    const result = hydrate(dom.container, tree, { onMismatch })
    expect(found).toEqual([])
    expect(result.mismatches).toEqual([])
    expect(dom.query('main')).toBe(main)
    expect(dom.query('button')).toBe(button)
    expect(button.textContent).toBe('Clicked 3 times')
    dom.click(button)
    expect(button.textContent).toBe('Clicked 4 times')
  })

  test('splits text nodes merged by the HTML parser', async () => {
    const tree = <p>{'a'}{'b'}</p>
    const dom = createDom(await renderToString(tree))
    const p = dom.query('p')
    const { found, onMismatch } = collect()
    hydrate(dom.container, tree, { onMismatch })
    expect(found).toEqual([])
    expect(dom.query('p')).toBe(p)
    expect(p.textContent).toBe('ab')
  })

  test('reactive text hydrates and updates; dispose leaves the DOM', async () => {
    const count = signal(0)
    const tree = <p>{count}</p>
    const dom = createDom(await renderToString(tree))
    const p = dom.query('p')
    const { found, onMismatch } = collect()
    const result = hydrate(dom.container, tree, { onMismatch })
    expect(found).toEqual([])
    count.set(5)
    expect(p.textContent).toBe('5')
    result.dispose()
    count.set(9)
    expect(p.textContent).toBe('5')
    expect(dom.query('p')).toBe(p)
  })
})

describe('hydrate mismatches', () => {
  test('replaces only the mismatching subtree and reports the path', () => {
    const dom = createDom('<main><div>x</div><span>keep</span></main>')
    const main = dom.query('main')
    const span = dom.query('span')
    const { found, onMismatch } = collect()
    hydrate(dom.container, <main><p>x</p><span>keep</span></main>, { onMismatch })
    expect(found.length).toBe(1)
    expect(found[0]?.message).toBe('expected <p> but found <div>')
    expect(found[0]?.path).toBe('main')
    expect(dom.query('main')).toBe(main)
    expect(dom.query('span')).toBe(span)
    expect(dom.container.innerHTML).toBe('<main><p>x</p><span>keep</span></main>')
  })

  test('corrects differing text in place', () => {
    const dom = createDom('<p>old</p>')
    const p = dom.query('p')
    const { found, onMismatch } = collect()
    hydrate(dom.container, <p>new</p>, { onMismatch })
    expect(found.length).toBe(1)
    expect(dom.query('p')).toBe(p)
    expect(p.textContent).toBe('new')
  })

  test('creates missing nodes and removes unexpected ones', () => {
    const missing = createDom('<ul><li>a</li></ul>')
    const first = missing.query('li')
    const a = collect()
    hydrate(missing.container, <ul><li>a</li><li>b</li></ul>, { onMismatch: a.onMismatch })
    expect(a.found.length).toBe(1)
    expect(missing.query('li')).toBe(first)
    expect(missing.container.querySelectorAll('li').length).toBe(2)
    const extra = createDom('<ul><li>a</li><li>b</li></ul>')
    const b = collect()
    hydrate(extra.container, <ul><li>a</li></ul>, { onMismatch: b.onMismatch })
    expect(b.found.length).toBe(1)
    expect(b.found[0]?.message).toContain('unexpected')
    expect(extra.container.querySelectorAll('li').length).toBe(1)
  })

  test('reports and repairs attribute differences', () => {
    const dom = createDom('<p class="a">x</p>')
    const { found, onMismatch } = collect()
    hydrate(dom.container, <p class="b">x</p>, { onMismatch })
    expect(found.length).toBe(1)
    expect(found[0]?.message).toContain("attribute 'class'")
    expect(dom.query('p').getAttribute('class')).toBe('b')
  })
})