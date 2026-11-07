import { escapeHtml } from './escape.ts'

interface Rule {
  readonly cls: string
  readonly source: string
}

interface Language {
  readonly key: string
  readonly rules: readonly Rule[]
}

const BACKTICK_STRING = '`(?:\\\\.|[^`\\\\])*`'
const SCRIPT_KEYWORDS = 'import|export|from|default|const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|implements|interface|type|enum|async|await|try|catch|finally|throw|typeof|instanceof|in|of|as|satisfies|readonly|declare|namespace|void|null|undefined|true|false|this|super|yield|static|public|private|protected|abstract|keyof|unique|infer|is|asserts|override'

const COMMENT_SLASH: Rule = { cls: 'c', source: String.raw`\/\/[^\n]*|\/\*[\s\S]*?\*\/` }
const STRINGS: Rule = { cls: 's', source: String.raw`'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|` + BACKTICK_STRING }

const SCRIPT_RULES: readonly Rule[] = [
  COMMENT_SLASH,
  STRINGS,
  { cls: 'n', source: String.raw`\b\d[\d_]*(?:\.\d+)?\b` },
  { cls: 'k', source: String.raw`(?<![.\w$])\b(?:${SCRIPT_KEYWORDS})\b` },
  { cls: 'f', source: String.raw`[A-Za-z_$][\w$]*(?=\s*\()` },
  { cls: 'p', source: String.raw`[A-Za-z_$][\w$]*(?=\s*\??:(?!:))` },
  { cls: 't', source: String.raw`\b[A-Z][A-Za-z0-9_$]*\b` }
]

const JSX_TAG: Rule = { cls: 'g', source: String.raw`(?<![\w$)\]])<\/?[A-Za-z][\w.-]*` }

const LANGUAGES: Readonly<Record<string, Language>> = {
  ts: { key: 'ts', rules: SCRIPT_RULES },
  tsx: { key: 'tsx', rules: [COMMENT_SLASH, STRINGS, JSX_TAG, ...SCRIPT_RULES.slice(2)] },
  json: {
    key: 'json',
    rules: [
      { cls: 'p', source: String.raw`"(?:\\.|[^"\\\n])*"(?=\s*:)` },
      { cls: 's', source: String.raw`"(?:\\.|[^"\\\n])*"` },
      { cls: 'n', source: String.raw`-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b` },
      { cls: 'k', source: String.raw`\b(?:true|false|null)\b` }
    ]
  },
  bash: {
    key: 'bash',
    rules: [
      { cls: 'c', source: String.raw`(?<![\w$'"])#[^\n]*` },
      { cls: 's', source: String.raw`'[^'\n]*'|"(?:\\.|[^"\\\n])*"` },
      { cls: 'v', source: String.raw`\$\{[^}\n]*\}|\$[A-Za-z_]\w*|\b[A-Z][A-Z0-9_]*(?==)` },
      { cls: 'p', source: String.raw`(?<=\s)--?[A-Za-z][\w-]*` },
      { cls: 'f', source: String.raw`(?<![\w./:@-])(?:bun|git|cd|curl|echo|export|mkdir|rm|cp|mv|cat|grep|ls|sed|npm|node|tsc)(?![\w./:@-])` }
    ]
  },
  html: {
    key: 'html',
    rules: [
      { cls: 'c', source: String.raw`<!--[\s\S]*?-->` },
      { cls: 's', source: String.raw`"[^"\n]*"|'[^'\n]*'` },
      { cls: 'g', source: String.raw`<\/?[A-Za-z][\w:-]*|\/?>` }
    ]
  }
}

const ALIASES: Readonly<Record<string, string>> = {
  ts: 'ts', typescript: 'ts', js: 'ts', javascript: 'ts', mjs: 'ts',
  tsx: 'tsx', jsx: 'tsx',
  json: 'json', jsonc: 'json',
  sh: 'bash', bash: 'bash', shell: 'bash', console: 'bash', zsh: 'bash',
  html: 'html', xml: 'html', svg: 'html'
}

const compiled = new Map<string, RegExp>()

function regexFor(language: Language): RegExp {
  let regex = compiled.get(language.key)
  if (regex === undefined) {
    regex = new RegExp(language.rules.map((rule) => `(${rule.source})`).join('|'), 'g')
    compiled.set(language.key, regex)
  }
  return regex
}

/**
 * Highlights source code to an HTML string of `tok-*` spans. Unknown languages are
 * returned escaped and unstyled. The output is always safe to insert as HTML.
 */
export function highlight(code: string, lang: string): string {
  const alias = ALIASES[lang.toLowerCase()]
  const language = alias === undefined ? undefined : LANGUAGES[alias]
  if (language === undefined) return escapeHtml(code)
  let output = ''
  let last = 0
  for (const match of code.matchAll(regexFor(language))) {
    const text = match[0]
    if (text === '') continue
    const start = match.index ?? 0
    const group = match.findIndex((value, index) => index > 0 && value !== undefined)
    const cls = language.rules[group - 1]?.cls
    output += escapeHtml(code.slice(last, start))
    output += cls === undefined ? escapeHtml(text) : `<span class="tok-${cls}">${escapeHtml(text)}</span>`
    last = start + text.length
  }
  return output + escapeHtml(code.slice(last))
}