import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { escapeText } from '@gambrel/view'
import { renderIconSvg } from '../src/svg.ts'
import { readIconDirectory } from './lib.ts'

const root = join(import.meta.dir, '..')
const entries = await readIconDirectory(join(root, 'svg'))
const cells = entries.map(({ name, node }) => `<figure>${renderIconSvg(node, { size: 28 })}<figcaption>${escapeText(name)}</figcaption></figure>`).join('')

const html = `<!doctype html><meta charset="utf-8"><title>Gambrel icons</title>
<style>body{font:14px system-ui;margin:2rem;color:#18181b}h1{font-size:1.2rem}label{margin-right:1rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:.75rem;margin-top:1rem}
figure{margin:0;padding:.9rem .5rem;border:1px solid #e4e4e7;border-radius:8px;text-align:center}
figure svg{width:var(--size,28px);height:var(--size,28px);stroke-width:var(--stroke,2)}
figcaption{margin-top:.5rem;font-size:.7rem;color:#71717a;word-break:break-all}</style>
<h1>${entries.length} icons</h1>
<label>size <input type="range" min="12" max="64" value="28" oninput="document.body.style.setProperty('--size',this.value+'px')"></label>
<label>stroke <input type="range" min="0.5" max="3" step="0.25" value="2" oninput="document.body.style.setProperty('--stroke',this.value)"></label>
<div class="grid">${cells}</div>`

const target = join(root, 'preview.html')
await writeFile(target, html, 'utf8')
console.log(`Wrote ${target}`)