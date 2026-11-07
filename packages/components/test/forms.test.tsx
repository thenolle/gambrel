/** @jsxImportSource @gambrel/view */
import { describe, expect, test } from 'bun:test'
import { hydrate, mount, type HydrationMismatch } from '@gambrel/browser'
import { signal } from '@gambrel/reactivity'
import { renderToString, type Child } from '@gambrel/view'
import {
  Checkbox,
  Field,
  FieldGroup,
  FileInput,
  Input,
  InputGroup,
  InputGroupAddon,
  NumberInput,
  PasswordInput,
  RadioGroup,
  SearchInput,
  Select,
  Slider,
  ToggleGroup
} from '../src/index.ts'
import { stepNumber, validateNumberBounds } from '../src/lib/number.ts'
import { createDom } from './dom.ts'

function inputValue(
  dom: ReturnType<typeof createDom>,
  input: HTMLInputElement,
  value: string
): void {
  input.value = value
  dom.fire(input, 'input')
}

describe('fields and input groups', () => {
  test('links the label, description and error to the control', async () => {
    const html = await renderToString(
      <Field
        id="email"
        label="Email"
        required
        description="Your work address"
        error="Enter a valid email"
      >
        {(props) => <Input {...props} type="email" required />}
      </Field>
    )

    expect(html).toContain('for="email"')
    expect(html).toContain('id="email"')
    expect(html).toContain('aria-describedby="email-description email-error"')
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('id="email-description"')
    expect(html).toContain('id="email-error"')
  })

  test('does not create missing descriptions or error links', async () => {
    const html = await renderToString(
      <Field id="name" label="Name">
        {(props) => <Input {...props} />}
      </Field>
    )
    expect(html).not.toContain('aria-describedby')
    expect(html).not.toContain('aria-invalid')
  })

  test('rejects empty field ids', () => {
    expect(() => Field({
      id: '',
      label: 'Name',
      children: () => null
    })).toThrow('non-empty id')
  })

  test('input groups preserve input markup and addons', async () => {
    const html = await renderToString(
      <InputGroup>
        <InputGroupAddon>https://</InputGroupAddon>
        <Input name="domain" />
        <InputGroupAddon align="end">.com</InputGroupAddon>
      </InputGroup>
    )
    expect(html).toContain('gb-input-group-addon-start')
    expect(html).toContain('gb-input-group-addon-end')
    expect(html).toContain('name="domain"')
  })
})

describe('PasswordInput', () => {
  test('visibility changes without replacing the input or its value', () => {
    const dom = createDom()
    mount(dom.container, <PasswordInput name="password" value="secret" />)

    const input = dom.query<HTMLInputElement>('input')
    const button = dom.query<HTMLButtonElement>('button')

    expect(input.type).toBe('password')
    dom.click(button)
    expect(input.type).toBe('text')
    expect(input.value).toBe('secret')
    expect(dom.query('input')).toBe(input)
    expect(button.getAttribute('aria-pressed')).toBe('true')

    dom.click(button)
    expect(input.type).toBe('password')
  })

  test('disabled state applies to the field and its action', async () => {
    const html = await renderToString(<PasswordInput disabled />)
    expect(html.match(/\bdisabled\b/g)?.length).toBe(2)
  })
})

describe('SearchInput', () => {
  test('typing, clearing and focus work', () => {
    const dom = createDom()
    const seen: string[] = []

    mount(dom.container, <SearchInput onValueChange={(value) => void seen.push(value)} />)

    const input = dom.query<HTMLInputElement>('input')
    const clear = dom.query<HTMLButtonElement>('button')

    expect(clear.hidden).toBe(true)
    inputValue(dom, input, 'gambrel')
    expect(clear.hidden).toBe(false)
    dom.click(clear)

    expect(input.value).toBe('')
    expect(dom.document.activeElement).toBe(input)
    expect(seen).toEqual(['gambrel', ''])
  })

  test('a declined controlled change is restored', () => {
    const dom = createDom()
    mount(dom.container, <SearchInput value="fixed" />)
    const input = dom.query<HTMLInputElement>('input')

    inputValue(dom, input, 'changed')
    expect(input.value).toBe('fixed')
  })

  test('external signal updates reach the input', () => {
    const dom = createDom()
    const query = signal('one')
    mount(dom.container, <SearchInput value={query} onValueChange={query.set} />)

    query.set('two')
    expect(dom.query<HTMLInputElement>('input').value).toBe('two')
  })

  test('native form reset restores the default silently', async () => {
    const dom = createDom()
    const seen: string[] = []
    mount(
      dom.container,
      <form>
        <SearchInput defaultValue="initial" onValueChange={(value) => void seen.push(value)} />
      </form>
    )

    const input = dom.query<HTMLInputElement>('input')
    inputValue(dom, input, 'changed')
    dom.query<HTMLFormElement>('form').reset()
    await Promise.resolve()

    expect(input.value).toBe('initial')
    expect(seen).toEqual(['changed'])
  })

  test('disposal removes the form reset listener', async () => {
    const dom = createDom()
    const root = mount(dom.container, <form><SearchInput defaultValue="a" /></form>)
    const form = dom.query<HTMLFormElement>('form')
    const input = dom.query<HTMLInputElement>('input')

    inputValue(dom, input, 'b')
    root.dispose()
    input.value = 'detached'
    dom.fire(form, 'reset')
    await Promise.resolve()

    expect(input.value).toBe('detached')
  })
})

describe('NumberInput', () => {
  test('steps predictably and respects bounds', () => {
    const dom = createDom()
    mount(dom.container, <NumberInput defaultValue={0.1} step={0.1} min={0} max={0.3} />)

    const input = dom.query<HTMLInputElement>('input')
    const decrement = dom.query<HTMLButtonElement>('[aria-label="Decrease value"]')
    const increment = dom.query<HTMLButtonElement>('[aria-label="Increase value"]')

    dom.click(increment)
    expect(input.value).toBe('0.2')
    dom.click(increment)
    dom.click(increment)
    expect(input.value).toBe('0.3')

    dom.click(decrement)
    expect(input.value).toBe('0.2')
  })

  test('empty input reports null and blur clamps numeric drafts', () => {
    const dom = createDom()
    const seen: Array<number | null> = []
    mount(
      dom.container,
      <NumberInput defaultValue={2} max={5} onValueChange={(value) => void seen.push(value)} />
    )

    const input = dom.query<HTMLInputElement>('input')
    inputValue(dom, input, '')
    expect(seen).toEqual([null])

    inputValue(dom, input, '9')
    dom.fire(input, 'blur')
    expect(input.value).toBe('5')
    expect(seen).toEqual([null, 9, 5])
  })

  test('controlled changes can be declined', () => {
    const dom = createDom()
    mount(dom.container, <NumberInput value={3} />)

    const input = dom.query<HTMLInputElement>('input')
    dom.click(dom.query('[aria-label="Increase value"]'))
    expect(input.value).toBe('3')

    inputValue(dom, input, '8')
    expect(input.value).toBe('3')
  })

  test('invalid bounds are rejected', () => {
    expect(() => validateNumberBounds({ step: 0 })).toThrow('positive')
    expect(() => validateNumberBounds({ min: 5, max: 2 })).toThrow('must not exceed')
    expect(stepNumber(0.2, 1, { step: 0.1 })).toBe(0.3)
  })

  test('form reset restores its numeric default', async () => {
    const dom = createDom()
    mount(dom.container, <form><NumberInput defaultValue={2} /></form>)

    dom.click(dom.query('[aria-label="Increase value"]'))
    dom.query<HTMLFormElement>('form').reset()
    await Promise.resolve()

    expect(dom.query<HTMLInputElement>('input').value).toBe('2')
  })
})

describe('FileInput', () => {
  test('reports the native file selection and updates its summary', () => {
    const dom = createDom()
    const file = { name: 'report.txt' } as File
    const seen: Array<readonly File[]> = []

    mount(dom.container, <FileInput onFilesChange={(files) => void seen.push(files)} />)
    const input = dom.query<HTMLInputElement>('input')

    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [file]
    })
    dom.change(input)

    expect(seen).toEqual([[file]])
    expect(dom.query('.gb-file-selection').textContent).toBe('report.txt')
  })

  test('rejects attempts to control file selection', () => {
    expect(() => FileInput({ value: 'not-allowed' })).toThrow('cannot be controlled')
  })

  test('resets the selection summary', async () => {
    const dom = createDom()
    mount(dom.container, <form><FileInput /></form>)
    const input = dom.query<HTMLInputElement>('input')
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [{ name: 'a.txt' }]
    })
    dom.change(input)
    dom.query<HTMLFormElement>('form').reset()
    await Promise.resolve()

    expect(dom.query('.gb-file-selection').textContent).toBe('No files selected')
  })
})

describe('ToggleGroup', () => {
  const items = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Disabled', disabled: true }
  ]

  test('single mode selects one and permits deselection', () => {
    const dom = createDom()
    mount(dom.container, <ToggleGroup items={items} aria-label="Choice" />)

    const [a, b] = dom.queryAll<HTMLButtonElement>('button')
    if (a === undefined || b === undefined) throw new Error('Missing buttons')

    dom.click(a)
    dom.click(b)
    expect(a.getAttribute('aria-pressed')).toBe('false')
    expect(b.getAttribute('aria-pressed')).toBe('true')

    dom.click(b)
    expect(b.getAttribute('aria-pressed')).toBe('false')
  })

  test('multiple mode and controlled signals work', () => {
    const dom = createDom()
    const selected = signal<readonly string[]>(['a'])
    mount(
      dom.container,
      <ToggleGroup
        type="multiple"
        items={items}
        value={selected}
        onValueChange={selected.set}
        aria-label="Formatting"
      />
    )

    const buttons = dom.queryAll<HTMLButtonElement>('button')
    const b = buttons[1]
    if (b === undefined) throw new Error('Missing Beta button')

    dom.click(b)
    expect(selected()).toEqual(['a', 'b'])
    expect(b.getAttribute('aria-pressed')).toBe('true')
  })

  test('duplicate values and invalid single selections are rejected', () => {
    expect(() => ToggleGroup({
      items: [{ value: 'a', label: 'A' }, { value: 'a', label: 'Again' }]
    })).toThrow('unique')

    expect(() => ToggleGroup({
      items,
      defaultValue: ['a', 'b']
    })).toThrow('at most one')
  })
})

describe('native forms and hydration', () => {
  test('successful controls retain native form submission values', () => {
    const dom = createDom()
    mount(
      dom.container,
      <form>
        <SearchInput name="query" defaultValue="gambrel" />
        <NumberInput name="quantity" defaultValue={2} />
        <PasswordInput name="password" value="secret" />
        <Checkbox name="agree" value="yes" defaultChecked />
        <RadioGroup
          name="plan"
          defaultValue="pro"
          options={[{ value: 'pro', label: 'Pro' }]}
        />
        <Select
          name="country"
          defaultValue="fr"
          options={[{ value: 'fr', label: 'France' }]}
        />
        <Slider name="volume" defaultValue={25} />
      </form>
    )

    const form = dom.query<HTMLFormElement>('form')
    const view = dom.document.defaultView
    if (view === null) throw new Error('Document has no window')

    const data = new view.FormData(form)
    expect(data.get('query')).toBe('gambrel')
    expect(data.get('quantity')).toBe('2')
    expect(data.get('password')).toBe('secret')
    expect(data.get('agree')).toBe('yes')
    expect(data.get('plan')).toBe('pro')
    expect(data.get('country')).toBe('fr')
    expect(data.get('volume')).toBe('25')
  })

  test('the whole new forms batch hydrates without mismatches', async () => {
    function Form(): Child {
      return (
        <form>
          <FieldGroup>
            <Field id="search" label="Search" description="Find a record">
              {(props) => <SearchInput {...props} defaultValue="Ada" />}
            </Field>
            <Field id="password" label="Password">
              {(props) => <PasswordInput {...props} />}
            </Field>
            <Field id="quantity" label="Quantity">
              {(props) => <NumberInput {...props} defaultValue={2} />}
            </Field>
            <FileInput aria-label="Attachments" multiple />
            <ToggleGroup
              aria-label="Options"
              items={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]}
            />
          </FieldGroup>
        </form>
      )
    }

    const tree = <Form />
    const dom = createDom(await renderToString(tree))
    const input = dom.query('input')
    const mismatches: HydrationMismatch[] = []

    hydrate(dom.container, tree, {
      onMismatch: (mismatch) => void mismatches.push(mismatch)
    })

    expect(mismatches).toEqual([])
    expect(dom.query('input')).toBe(input)
  })
})