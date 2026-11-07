import { Window } from 'happy-dom'

export function createDom(markup = '') {
  const window = new Window()
  const document = window.document as unknown as Document
  document.body.innerHTML = `<div id="app">${markup}</div>`
  const container = document.getElementById('app')
  if (container === null) throw new Error('Test container is missing')
  const dispatch = (element: Element, event: unknown): void => {
    element.dispatchEvent(event as Event)
  }
  return {
    container,
    query<T extends Element = Element>(selector: string): T {
      const found = container.querySelector<T>(selector)
      if (found === null) throw new Error(`No element matches '${selector}'`)
      return found
    },
    queryAll<T extends Element = Element>(selector: string): T[] {
      return Array.from(container.querySelectorAll<T>(selector))
    },
    click(element: Element): void {
      dispatch(element, new window.Event('click', { bubbles: true }))
    },
    change(element: Element): void {
      dispatch(element, new window.Event('change', { bubbles: true }))
    },
    key(element: Element, key: string): void {
      dispatch(element, new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
    }
  }
}