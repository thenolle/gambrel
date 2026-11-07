/** @jsxImportSource @gambrel/view */
import { describe, expect, test } from 'bun:test'
import { renderToString } from '@gambrel/view'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  buttonVariants,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  createPart,
  Input,
  Kbd,
  Label,
  Progress,
  Separator,
  Skeleton,
  Spinner,
  Textarea
} from '../src/index.ts'

describe('Button', () => {
  test('renders the default variant and size', async () => {
    expect(await renderToString(<Button>Save</Button>)).toBe(
      '<button type="button" class="gb-button gb-button-default gb-button-md">Save</button>'
    )
  })

  test('applies variants, extra classes and passes attributes through', async () => {
    const html = await renderToString(
      <Button variant="outline" size="sm" class="wide" disabled={true} aria-label="Go">
        Go
      </Button>
    )
    expect(html).toContain('gb-button-outline gb-button-sm wide')
    expect(html).toContain(' disabled')
    expect(html).toContain('aria-label="Go"')
  })

  test('does not emit event handlers and allows an explicit type', async () => {
    const html = await renderToString(<Button type="submit" onClick={() => {}}>Send</Button>)
    expect(html).toContain('type="submit"')
    expect(html).not.toContain('onclick')
  })

  test('buttonVariants styles a link', async () => {
    const html = await renderToString(<a href="/x" class={buttonVariants({ variant: 'ghost' })}>Link</a>)
    expect(html).toContain('class="gb-button gb-button-ghost gb-button-md"')
  })
})

describe('Badge, Card and Alert', () => {
  test('Badge variants', async () => {
    expect(await renderToString(<Badge>New</Badge>)).toBe('<span class="gb-badge gb-badge-default">New</span>')
    expect(await renderToString(<Badge variant="destructive">!</Badge>)).toContain('gb-badge-destructive')
  })

  test('Card parts render their structure', async () => {
    const html = await renderToString(
      <Card class="w-80">
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>About</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Foot</CardFooter>
      </Card>
    )
    expect(html).toContain('<div class="gb-card w-80">')
    expect(html).toContain('<h3 class="gb-card-title">Title</h3>')
    expect(html).toContain('<p class="gb-card-description">About</p>')
    expect(html).toContain('<div class="gb-card-content">Body</div>')
    expect(html).toContain('<div class="gb-card-footer">Foot</div>')
  })

  test('Alert has the alert role and a destructive variant', async () => {
    const html = await renderToString(
      <Alert variant="destructive">
        <AlertTitle>Oops</AlertTitle>
        <AlertDescription>Try again</AlertDescription>
      </Alert>
    )
    expect(html).toContain('<div role="alert" class="gb-alert gb-alert-destructive">')
    expect(html).toContain('<h5 class="gb-alert-title">Oops</h5>')
  })
})

describe('form controls', () => {
  test('Input is a void element with a default type and passes attributes', async () => {
    expect(await renderToString(<Input placeholder="Email" />)).toBe('<input type="text" placeholder="Email" class="gb-input">')
    expect(await renderToString(<Input type="email" required={true} class="x" />)).toBe('<input type="email" required class="gb-input x">')
  })

  test('Textarea keeps its content', async () => {
    expect(await renderToString(<Textarea rows={3}>Hi</Textarea>)).toBe(
      '<textarea rows="3" class="gb-textarea">Hi</textarea>'
    )
  })

  test('Label links with the for attribute', async () => {
    expect(await renderToString(<Label for="email">Email</Label>)).toBe('<label for="email" class="gb-label">Email</label>')
  })
})

describe('feedback and layout', () => {
  test('Separator is decorative by default and semantic on request', async () => {
    expect(await renderToString(<Separator />)).toBe('<div role="none" class="gb-separator gb-separator-horizontal"></div>')
    const html = await renderToString(<Separator orientation="vertical" decorative={false} />)
    expect(html).toContain('role="separator"')
    expect(html).toContain('aria-orientation="vertical"')
  })

  test('Skeleton and Kbd', async () => {
    expect(await renderToString(<Skeleton class="h-4" />)).toBe('<div class="gb-skeleton h-4"></div>')
    expect(await renderToString(<Kbd>K</Kbd>)).toBe('<kbd class="gb-kbd">K</kbd>')
  })

  test('Spinner is a labelled status icon', async () => {
    const html = await renderToString(<Spinner size={20} />)
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-label="Loading"')
    expect(html).toContain('gb-spinner')
    expect(html).toContain('width="20"')
  })

  test('Progress exposes its value and clamps it', async () => {
    const half = await renderToString(<Progress value={40} />)
    expect(half).toContain('role="progressbar"')
    expect(half).toContain('aria-valuenow="40"')
    expect(half).toContain('translateX(-60%)')
    const over = await renderToString(<Progress value={150} />)
    expect(over).toContain('aria-valuenow="100"')
    expect(over).toContain('translateX(-0%)')
    expect(await renderToString(<Progress value={() => 25} max={50} />)).toContain('translateX(-50%)')
  })
})

describe('createPart', () => {
  test('makes a wrapper with a base class that merges extras', async () => {
    const Panel = createPart('section', 'my-panel')
    expect(await renderToString(<Panel class="wide" id="a">x</Panel>)).toBe('<section id="a" class="my-panel wide">x</section>')
  })
})