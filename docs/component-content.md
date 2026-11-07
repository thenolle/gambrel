# Content and feedback components

Use these components for source examples, measurements, status messages and chronological content.

## CopyButton

```tsx
<CopyButton text="bun add @gambrel/core" />
```

The button copies after a user action and reports success or failure. It requires browser Clipboard API access.

`text` accepts a string or an accessor. Optional callbacks are `onCopied` and `onCopyError`.

## CodeBlock

```tsx
<CodeBlock
  title="src/server.ts"
  language="ts"
  code="serve(app, { port: 3000 })"
/>
```

Code is escaped, never executed. The component provides a copy action but does not perform syntax highlighting.

Set `copyable={false}` to omit the action.

## CharacterCount

```tsx
const description = signal('')

<CharacterCount value={description} max={120} />
```

Counts Unicode code points. This is not a grapheme-cluster counter and does not define the input's validation policy.

## Meter

```tsx
<Meter label="Storage usage" value={64} min={0} max={100} />
```

A native meter represents a measurement within a known range. Use Progress for task completion.

Values are clamped to finite bounds. `value` can be a number or accessor.

## StatusBadge

```tsx
<StatusBadge tone="success">Healthy</StatusBadge>
<StatusBadge tone="warning">Degraded</StatusBadge>
```

Tones are neutral, success, warning, danger and info. Always include meaningful text.

## Timeline

```tsx
<Timeline
  items={[
    {
      value: 'created',
      title: 'Project created',
      dateTime: '2026-11-07',
      dateLabel: '7 November 2026',
      description: 'Workspace initialized.'
    }
  ]}
/>
```

Supply date labels explicitly to keep server and browser rendering identical.

## Disclosure

```tsx
<Disclosure summary="Implementation details">
  Additional information.
</Disclosure>
```

Uses native details and summary elements. The browser owns the open state.

Use `defaultOpen` for its initial state. For controlled state, use Collapsible instead.

## VisuallyHidden

```tsx
<Button>
  <Search size={16} />
  <VisuallyHidden>Search projects</VisuallyHidden>
</Button>
```

Content remains available to assistive technology while visually clipped. Do not place focusable controls inside this wrapper.