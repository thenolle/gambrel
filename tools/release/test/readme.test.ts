import { describe, expect, test } from 'bun:test'
import { assertPackageReadme } from '../src/readme.ts'

describe('package README validation', () => {
  const name = '@gambrel/reactivity'

  test('accepts LF, CRLF and CR line endings', () => {
    for (const newline of ['\n', '\r\n', '\r']) expect(() => assertPackageReadme(`# ${name}${newline}${newline}Description`, name)).not.toThrow()
  })

  test('accepts a UTF-8 BOM', () => {
    expect(() => assertPackageReadme(`\uFEFF# ${name}\r\n\r\nDescription`, name)).not.toThrow()
  })

  test('accepts a heading without a final newline', () => {
    expect(() => assertPackageReadme(`# ${name}`, name)).not.toThrow()
  })

  test('accepts trailing heading whitespace', () => {
    expect(() => assertPackageReadme(`# ${name}  \r\nDescription`, name)).not.toThrow()
  })

  test('rejects another package and heading suffixes', () => {
    expect(() => assertPackageReadme('# @gambrel/view\n', name)).toThrow('received')
    expect(() => assertPackageReadme(`# ${name}-other\n`, name)).toThrow('received')
  })

  test('rejects empty files, leading blank lines and the wrong heading level', () => {
    for (const source of ['', `\n# ${name}`, `## ${name}`]) expect(() => assertPackageReadme(source, name)).toThrow('README.md must start')
  })
})