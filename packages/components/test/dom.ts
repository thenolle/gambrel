import { Window } from 'happy-dom'

export function createDom(markup = '') {
  const window = new Window()
  const document = window.document as unknown as Document
  document.body.innerHTML = `<div id="app">${markup}</div>`
  const container = document.getElementById('app')
  if (container === null) throw new Error('Test container is missing')
  const fire = (target: EventTarget, type: string, init: Record<string, unknown> = {}): void => {
    target.dispatchEvent(new window.Event(type, { bubbles: true, cancelable: true, ...init }) as unknown as Event)
  }
  return {
    document,
    container,
    fire,
    query<T extends Element = Element>(selector: string): T {
      const found = container.querySelector<T>(selector)
      if (found === null) throw new Error(`No element matches '${selector}'`)
      return found
    },
    queryAll<T extends Element = Element>(selector: string): T[] {
      return Array.from(container.querySelectorAll<T>(selector))
    },
    click(element: Element): void {
      fire(element, 'click')
    },
    change(element: Element): void {
      fire(element, 'change')
    },
    key(element: Element, key: string): void {
      target(element).dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }) as unknown as Event)
    }
  }
}

function target(element: Element): EventTarget {
  return element
}