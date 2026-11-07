import { describe, expect, test } from 'bun:test'
import { unescapeHtml } from '../src/escape.ts'
import { highlight } from '../src/highlight.ts'

describe('highlight', () => {
  test('colors keywords, numbers and comments', () => {
    const html = highlight('const x = 1 // hi', 'ts')
    expect(html).toContain('<span class="tok-k">const</span>')
    expect(html).toContain('<span class="tok-n">1</span>')
    expect(html).toContain('<span class="tok-c">// hi</span>')
  })

  test('a method named like a keyword is a function, not a keyword', () => {
    const html = highlight("app.get('/x')", 'ts')
    expect(html).toContain('<span class="tok-f">get</span>')
    expect(html).not.toContain('tok-k">get')
  })

  test('escapes HTML characters', () => {
    expect(highlight('a < b && c', 'ts')).toContain('a &lt; b &amp;&amp; c')
    expect(highlight('<b>', 'unknown-language')).toBe('&lt;b&gt;')
  })

  test('JSX tags are colored in tsx but generics are not', () => {
    expect(highlight('<Button onClick={x} />', 'tsx')).toContain('<span class="tok-g">&lt;Button</span>')
    expect(highlight('const p: Promise<Child> = x', 'tsx')).not.toContain('tok-g')
  })

  test('json keys differ from json string values', () => {
    const html = highlight('{"a": "b", "n": true}', 'json')
    expect(html).toContain('<span class="tok-p">&quot;a&quot;</span>')
    expect(html).toContain('<span class="tok-s">&quot;b&quot;</span>')
    expect(html).toContain('<span class="tok-k">true</span>')
  })

  test('bash commands, flags and comments', () => {
    const html = highlight('bun run build --watch # note', 'bash')
    expect(html).toContain('<span class="tok-f">bun</span>')
    expect(html).toContain('<span class="tok-p">--watch</span>')
    expect(html).toContain('<span class="tok-c"># note</span>')
  })

  test('never loses or changes characters', () => {
    const samples: Array<[string, string]> = [
      ["import { a } from 'b'\nexport default function f<T>(x: T): T { return x }", 'ts'],
      ['<Layout title="x">{`t ${1}`}</Layout>', 'tsx'],
      ['{"k": [1, 2.5e3, null]}', 'json'],
      ['NODE_ENV=production bun dist/server/index.js', 'bash']
    ]
    for (const [code, lang] of samples) {
      expect(unescapeHtml(highlight(code, lang).replace(/<[^>]+>/g, ''))).toBe(code)
    }
  })

  test('command names inside URLs and file names are not commands', () => {
    const html = highlight('git clone https://github.com/acme/demo.git', 'bash')
    expect(html).toContain('<span class="tok-f">git</span> clone')
    expect(html).toContain('demo.git')
    expect(html).not.toContain('demo.<span')
    expect(highlight('cat bun.lock', 'bash')).toContain('bun.lock')
  })
})