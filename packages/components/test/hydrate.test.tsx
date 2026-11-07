/** @jsxImportSource @gambrel/view */
import { expect, test } from 'bun:test'
import { hydrate, type HydrationMismatch } from '@gambrel/browser'
import { renderToString } from '@gambrel/view'
import { Window } from 'happy-dom'
import { Alert, AlertTitle, Badge, Button, Card, CardContent, Input, Progress, Separator, Spinner } from '../src/index.ts'

test('server-rendered components hydrate without mismatches', async () => {
  const tree = (
    <Card>
      <CardContent>
        <Alert>
          <AlertTitle>Heads up</AlertTitle>
        </Alert>
        <Badge variant="secondary">Beta</Badge>
        <Input placeholder="Name" />
        <Progress value={30} />
        <Separator />
        <Spinner />
        <Button variant="outline">Save</Button>
      </CardContent>
    </Card>
  )
  const window = new Window()
  const document = window.document as unknown as Document
  document.body.innerHTML = `<div id="app">${await renderToString(tree)}</div>`
  const container = document.getElementById('app')
  if (container === null) throw new Error('Container missing')
  const button = container.querySelector('button')
  const found: HydrationMismatch[] = []
  hydrate(container, tree, { onMismatch: (mismatch) => void found.push(mismatch) })
  expect(found).toEqual([])
  expect(container.querySelector('button')).toBe(button)
})