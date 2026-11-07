import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { siteRoot } from './bundle.ts'
import { appIcon, socialImage } from './social-image.ts'

const directory = join(siteRoot, '.artwork-preview')
await mkdir(directory, { recursive: true })

const cards = [
  { file: 'home.png', title: 'Gambrel documentation', description: 'TypeScript-first applications with explicit server and browser boundaries.' },
  { file: 'components.png', title: 'Components', description: 'Forms, application interfaces, overlays and content components.' },
  { file: 'long-title.png', title: 'Configuration and application deployment', description: 'Build, configure and deploy your Gambrel application.' }
]

for (const card of cards) await writeFile(join(directory, card.file), socialImage(card.title, card.description))
for (const size of [192, 512]) await writeFile(join(directory, `icon-${size}.png`), appIcon(size))

console.log(`Artwork generated in ${directory}`)