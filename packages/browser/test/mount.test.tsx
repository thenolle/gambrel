/** @jsxImportSource @gambrel/view */
import { describe, expect, test } from 'bun:test'
import { onCleanup, signal } from '@gambrel/reactivity'
import { createElement, type Child } from '@gambrel/view'
import { mount } from '../src/index.ts'
import { createDom } from './dom.ts'

function Counter(props: { initial: number }): Child {
  const count = signal(props.initial)
  return (
    <button type="button" onClick={() => count.update((n) => n + 1)}>
      Clicked {count} times
    </button>
  )
}

describe('mount', () => {
  test('renders elements, attributes and text', () => {
    const dom = createDom('<p>old</p>')
    mount(dom.container, <section id="a" hidden={true} title={null}><b>hi</b> there</section>)
    expect(dom.container.innerHTML).toBe('<section id="a" hidden=""><b>hi</b> there</section>')
  })

  test('reactive text updates the DOM', () => {
    const dom = createDom()
    const count = signal(0)
    mount(dom.container, <p>{count}</p>)
    expect(dom.query('p').textContent).toBe('0')
    count.set(1)
    expect(dom.query('p').textContent).toBe('1')
  })

  test('reactive attributes update the DOM', () => {
    const dom = createDom()
    const on = signal(false)
    mount(dom.container, <p class={() => (on() ? 'on' : 'off')}>x</p>)
    expect(dom.query('p').getAttribute('class')).toBe('off')
    on.set(true)
    expect(dom.query('p').getAttribute('class')).toBe('on')
  })

  test('event handlers run', () => {
    const dom = createDom()
    mount(dom.container, <Counter initial={2} />)
    const button = dom.query('button')
    expect(button.textContent).toBe('Clicked 2 times')
    dom.click(button)
    expect(button.textContent).toBe('Clicked 3 times')
  })

  test('dispose removes listeners, stops updates and clears the container', () => {
    const dom = createDom()
    const count = signal(0)
    const mounted = mount(dom.container, <button onClick={() => count.update((n) => n + 1)}>go</button>)
    const button = dom.query('button')
    dom.click(button)
    expect(count.peek()).toBe(1)
    mounted.dispose()
    dom.click(button)
    expect(count.peek()).toBe(1)
    expect(dom.container.childNodes.length).toBe(0)
  })

  test('replacing a dynamic region disposes what it owned', () => {
    const dom = createDom()
    let disposed = 0
    function Probe(): Child {
      onCleanup(() => {
        disposed += 1
      })
      return <i>probe</i>
    }
    const show = signal(true)
    mount(dom.container, <div>{() => (show() ? <Probe /> : null)}</div>)
    expect(dom.container.querySelector('i')).not.toBeNull()
    show.set(false)
    expect(disposed).toBe(1)
    expect(dom.container.querySelector('i')).toBeNull()
    show.set(true)
    expect(dom.container.querySelector('i')).not.toBeNull()
  })

  test('ref receives the element', () => {
    const dom = createDom()
    const seen: Element[] = []
    mount(dom.container, <p ref={(el: Element) => seen.push(el)}>x</p>)
    expect(seen).toEqual([dom.query('p')])
  })

  test('async components and non-function handlers throw', () => {
    const dom = createDom()
    async function Late(): Promise<Child> {
      return <p>late</p>
    }
    expect(() => mount(dom.container, <Late />)).toThrow('Async components')
    expect(() => mount(dom.container, createElement('button', { onClick: 'x' }))).toThrow('must be a function')
  })
})