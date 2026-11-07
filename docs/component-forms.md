# Form components

Gambrel form components use native controls wherever possible. They add consistent styling, linked field descriptions and useful actions without replacing ordinary HTML forms.

## Link a field correctly

`Field` requires an explicit ID and a child function. Spread the supplied props onto the control:

```tsx
<Field
  id="email"
  label="Email"
  description="Use your work address."
  error="Enter a valid email address."
  required
>
  {(props) => <Input {...props} type="email" name="email" required />}
</Field>
```

The label uses `for="email"`. The description and error have stable IDs referenced by `aria-describedby`. An error adds `aria-invalid="true"`.

`Field.required` is a visual indicator. The actual control still needs `required`.

For custom layouts, use `FieldLabel`, `FieldDescription`, `FieldError` and `FieldGroup` directly and link their IDs yourself.

## Input groups

```tsx
<InputGroup>
  <InputGroupAddon>https://</InputGroupAddon>
  <Input name="domain" aria-label="Domain" />
  <InputGroupAddon align="end">.com</InputGroupAddon>
</InputGroup>
```

An action can use `InputGroupButton`. It defaults to a ghost button and never submits the form unless you explicitly set its type.

## Enhanced inputs

| Component       | State                                    | Behavior                                       |
| --------------- | ---------------------------------------- | ---------------------------------------------- |
| `PasswordInput` | Native value props                       | Toggles visibility without replacing the input |
| `SearchInput`   | `value`, `defaultValue`, `onValueChange` | Search icon and clear action                   |
| `NumberInput`   | `number` or `null`                       | Editable input plus increment/decrement        |
| `FileInput`     | Browser-owned selection                  | Native picker and selected-file summary        |
| `ToggleGroup`   | Array of selected strings                | Single or multiple toggles                     |

Pass `id`, `name`, `required`, `disabled`, `autocomplete`, and accessible attributes to the control as usual.

### Controlled search

```tsx
const query = signal('')

<SearchInput
  value={query}
  onValueChange={query.set}
  aria-label="Search users"
/>
```

A controlled component does not store accepted changes itself. Update the supplied signal in the callback. If the parent declines a change, the input returns to the controlled value.

### Number inputs

```tsx
<NumberInput
  name="quantity"
  defaultValue={1}
  min={1}
  max={20}
  step={1}
/>
```

An empty input reports `null`. Finite typed values are reported as numbers. Values outside the bounds are clamped on blur. Native step validation remains in place; typing does not silently round a value to a step multiple.

The public read-only prop is `readOnly`.

### File inputs

```tsx
<FileInput
  name="attachments"
  accept=".pdf,.txt"
  multiple
  onFilesChange={(files) => console.log(files.map((file) => file.name))}
/>
```

`accept` is a browser picker hint, not server-side validation. Validate uploads independently on the server.

File selection cannot be controlled with `value` or `defaultValue`. The component throws if either is supplied.

### Toggle groups

```tsx
<ToggleGroup
  type="multiple"
  aria-label="Text formatting"
  items={[
    { value: 'bold', label: 'Bold' },
    { value: 'italic', label: 'Italic' }
  ]}
/>
```

Both modes use arrays. Single mode permits zero or one value. Item values must be unique and non-empty.

Toggle groups do not submit a form field. Add hidden inputs yourself when selected values must be submitted.

## Complete preferences form

This component works in the browser after hydration and submits a native form. The `/preferences` POST endpoint is application code: implement validation and persistence in your server handler.

```tsx title="src/components/preferences-form.tsx"
/** @jsxImportSource @gambrel/view */
import {
  Button,
  Checkbox,
  Field,
  FieldGroup,
  FileInput,
  NumberInput,
  PasswordInput,
  RadioGroup,
  SearchInput,
  Select,
  Slider
} from '@gambrel/components'
import type { Child } from '@gambrel/view'

export function PreferencesForm(): Child {
  return (
    <form method="post" action="/preferences" enctype="multipart/form-data">
      <FieldGroup>
        <Field id="display-search" label="Saved search">
          {(props) => (
            <SearchInput {...props} name="savedSearch" defaultValue="Gambrel" />
          )}
        </Field>

        <Field id="new-password" label="New password" description="Leave empty to keep the current password.">
          {(props) => (
            <PasswordInput {...props} name="password" autocomplete="new-password" />
          )}
        </Field>

        <Field id="quantity" label="Results per page">
          {(props) => (
            <NumberInput {...props} name="quantity" defaultValue={10} min={1} max={100} />
          )}
        </Field>

        <Field id="country" label="Country">
          {(props) => (
            <Select
              {...props}
              name="country"
              defaultValue="fr"
              options={[
                { value: 'fr', label: 'France' },
                { value: 'gb', label: 'United Kingdom' }
              ]}
            />
          )}
        </Field>

        <RadioGroup
          name="plan"
          aria-label="Plan"
          defaultValue="personal"
          options={[
            { value: 'personal', label: 'Personal' },
            { value: 'team', label: 'Team' }
          ]}
        />

        <Field id="volume" label="Notification volume">
          {(props) => (
            <Slider {...props} name="volume" defaultValue={50} />
          )}
        </Field>

        <Field id="attachments" label="Attachments">
          {(props) => <FileInput {...props} name="attachments" multiple />}
        </Field>

        <label>
          <Checkbox name="notifications" value="yes" defaultChecked />
          Receive notifications
        </label>

        <div>
          <Button type="reset" variant="outline">Reset</Button>
          <Button type="submit">Save preferences</Button>
        </div>
      </FieldGroup>
    </form>
  )
}
```

The enhanced SearchInput and NumberInput restore their uncontrolled defaults on a native form reset. Controlled state remains the parent's responsibility. Existing controls have their own reset behavior; do not assume a reset changes external signals.

## CSS

Load `@gambrel/components/styles.css` once. The components use the existing `gb-*` classes and HSL theme variables.

No utility-class framework is required.

## Boundaries

These components provide UI behavior, not a validation or authentication framework. The server must validate submitted fields, uploaded files, permissions and persistence.