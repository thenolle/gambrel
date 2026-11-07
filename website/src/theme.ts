export type ThemeChoice = 'light' | 'dark' | 'system'

const KEY = 'gambrel-docs-theme'

export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): 'light' | 'dark' {
  if (choice === 'system') return prefersDark ? 'dark' : 'light'
  return choice
}

export function readChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    return 'system'
  }
  return 'system'
}

/**
 * Applies and stores a theme choice. `system` follows the operating system setting.
 */
export function applyTheme(choice: ThemeChoice): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.dataset['theme'] = resolveTheme(choice, prefersDark)
  try {
    localStorage.setItem(KEY, choice)
  } catch {
    return
  }
}