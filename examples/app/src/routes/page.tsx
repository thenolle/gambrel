/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { Counter } from '../components/counter.tsx'

export default function HomePage(): Child {
  return (
    <section>
      <h1>Gambrel</h1>
      <p>Server-rendered, then hydrated in the browser.</p>
      <Counter />
    </section>
  )
}