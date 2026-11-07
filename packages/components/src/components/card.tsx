import { createPart } from '../lib/part.ts'

export const Card = createPart('div', 'gb-card')
export const CardHeader = createPart('div', 'gb-card-header')
export const CardTitle = createPart('h3', 'gb-card-title')
export const CardDescription = createPart('p', 'gb-card-description')
export const CardContent = createPart('div', 'gb-card-content')
export const CardFooter = createPart('div', 'gb-card-footer')