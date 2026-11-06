import { describe, expect, test } from 'bun:test'
import { hooksFromModule } from '../src/index.ts'

describe('hooksFromModule', () => {
  test('maps beforeLoad and loader', () => {
    const beforeLoad = (): void => { }
    const loader = (): null => null
    const hooks = hooksFromModule('page:/a', { beforeLoad, loader })
    expect(hooks.guard).toBe(beforeLoad as unknown as typeof hooks.guard)
    expect(hooks.loader).toBe(loader as unknown as typeof hooks.loader)
  })

  test('accepts a module with only one hook', () => {
    expect(hooksFromModule('page:/a', { loader: () => null }).guard).toBeUndefined()
  })

  test('rejects unknown exports, missing hooks and non-functions', () => {
    expect(() => hooksFromModule('page:/a', { Loader: () => null })).toThrow("exports 'Loader'")
    expect(() => hooksFromModule('page:/a', { default: () => null })).toThrow("exports 'default'")
    expect(() => hooksFromModule('page:/a', {})).toThrow("must export 'loader' or 'beforeLoad'")
    expect(() => hooksFromModule('page:/a', { loader: 1 })).toThrow('must be a function')
  })
})