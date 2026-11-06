import { describe, expect, test } from 'bun:test'
import { createElement, raw, renderToString, type Child } from '../src/index.ts'

function Greeting(props: { name: string }): Child {
  return <p>Hello, {props.name}</p>
}

function Layout(props: { children?: Child }): Child {
  return <main>{props.children}</main>
}

async function Slow(props: { ms: number; label: string }): Promise<Child> {
  await new Promise((resolve) => setTimeout(resolve, props.ms))
  return <i>{props.label}</i>
}

describe('escaping and attributes', () => {
  test('escapes text and attribute values', async () => {
    const html = await renderToString(
      <div id={'a"b'} class="x">
        {'1 < 2 & 3'}
      </div>
    )
    expect(html).toBe('<div id="a&quot;b" class="x">1 &lt; 2 &amp; 3</div>')
  })

  test('serializes booleans, numbers and omitted attributes consistently', async () => {
    const html = await renderToString(<input disabled={true} hidden={false} value={5} title={null} />)
    expect(html).toBe('<input disabled value="5">')
  })

  test('renders numbers as text, including zero', async () => {
    expect(await renderToString(<p tabindex={0}>{0}{1.5}</p>)).toBe('<p tabindex="0">01.5</p>')
  })

  test('void elements have no closing tag', async () => {
    expect(await renderToString(<p>a<br />b</p>)).toBe('<p>a<br>b</p>')
  })

  test('event props are never emitted, in any casing', async () => {
    const html = await renderToString(
      createElement('button', { onClick: () => {}, onclick: 'alert(1)', children: 'Go' })
    )
    expect(html).toBe('<button>Go</button>')
  })
})

describe('children', () => {
  test('null, undefined and booleans render nothing', async () => {
    expect(await renderToString(<p>{null}{undefined}{true}{false}x</p>)).toBe('<p>x</p>')
  })

  test('arrays and fragments render in order', async () => {
    const list = await renderToString(<ul>{['a', 'b'].map((n) => <li>{n}</li>)}</ul>)
    expect(list).toBe('<ul><li>a</li><li>b</li></ul>')
    expect(await renderToString(<><b>1</b><b>2</b></>)).toBe('<b>1</b><b>2</b>')
  })

  test('nested components receive props and children', async () => {
    const html = await renderToString(
      <Layout>
        <Greeting name="Ada" />
      </Layout>
    )
    expect(html).toBe('<main><p>Hello, Ada</p></main>')
  })

  test('accessors are called once and never serialized', async () => {
    const label = (): string => 'dyn'
    expect(await renderToString(<p class={() => 'c'}>{label}</p>)).toBe('<p class="c">dyn</p>')
  })

  test('async components render in document order regardless of timing', async () => {
    const html = await renderToString(
      <div>
        <Slow ms={30} label="slow" />
        <Slow ms={0} label="fast" />
      </div>
    )
    expect(html).toBe('<div><i>slow</i><i>fast</i></div>')
  })
})

describe('raw html', () => {
  test('raw() is emitted verbatim', async () => {
    expect(await renderToString(<div>{raw('<b>x</b>')}</div>)).toBe('<div><b>x</b></div>')
    expect(await renderToString([raw('<!doctype html>'), <html></html>])).toBe('<!doctype html><html></html>')
  })

  test('script content must be raw()', async () => {
    const ok = await renderToString(<script type="application/json">{raw('{"a":1}')}</script>)
    expect(ok).toBe('<script type="application/json">{"a":1}</script>')
    await expect(renderToString(<script>{'x'}</script>)).rejects.toThrow('raw()')
  })
})

describe('invalid input fails loudly', () => {
  test('rejects className and htmlFor', async () => {
    await expect(renderToString(<div className="x" />)).rejects.toThrow("'class'")
    await expect(renderToString(<label htmlFor="x" />)).rejects.toThrow("'for'")
  })

  test('rejects invalid names and unsupported values', async () => {
    await expect(renderToString(createElement('div', { 'a b': 'x' }))).rejects.toThrow('Invalid attribute name')
    await expect(renderToString(createElement('div><script', {}))).rejects.toThrow('Invalid element name')
    await expect(renderToString(createElement('div', { title: {} }))).rejects.toThrow('unsupported value')
    await expect(renderToString(<div data-fn={() => () => 1} />)).rejects.toThrow('unsupported value')
  })

  test('rejects children on void elements and unsupported children', async () => {
    await expect(renderToString(createElement('br', { children: 'x' }))).rejects.toThrow('void element')
    await expect(renderToString({} as unknown as Child)).rejects.toThrow('Cannot render')
  })
})