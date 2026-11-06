import { Window } from 'happy-dom'

export interface TestDom {
  readonly document: Document
  readonly container: HTMLElement
  query(selector: string): Element
  click(element: Element): void
}

export function createDom(markup = ''): TestDom {
  const window = new Window()
  const document = window.document as unknown as Document
  document.body.innerHTML = `<div id="app">${markup}</div>`
  const container = document.getElementById('app')
  if (container === null) throw new Error('Test container is missing')
  return {
    document,
    container,
    query: (selector) => {
      const found = container.querySelector(selector)
      if (found === null) throw new Error(`No element matches '${selector}'`)
      return found
    },
    click: (element) => {
      element.dispatchEvent(new window.Event('click', { bubbles: true }) as unknown as Event)
    }
  }
}