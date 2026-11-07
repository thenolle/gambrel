/** @jsxImportSource @gambrel/view */
import { expect, test } from 'bun:test'
import { renderToString } from '@gambrel/view'
import { Gambrel } from '../src/index.ts'

test('the Gambrel mark renders with the standard icon API', async () => {
  const html = await renderToString(
    <Gambrel size={20} title="Gambrel" />
  )

  expect(html).toContain('gb-icon-gambrel')
  expect(html).toContain('width="20"')
  expect(html).toContain('height="20"')
  expect(html).toContain('viewBox="0 0 24 24"')
  expect(html).toContain('<title>Gambrel</title>')
  expect(html).toContain('role="img"')
  expect(html).not.toContain('aria-hidden')
})