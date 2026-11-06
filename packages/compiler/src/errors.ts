/**
 * Thrown when the routes directory or a route file breaks a convention. `problems`
 * lists every issue found, each naming the offending file or directory.
 */
export class CompilerError extends Error {
  readonly problems: readonly string[]

  constructor(message: string, problems: readonly string[] = []) {
    super(problems.length === 0 ? message : `${message}\n${problems.map((problem) => `  - ${problem}`).join('\n')}`)
    this.name = 'CompilerError'
    this.problems = problems
  }
}