/**
 * Validates the first Markdown heading without depending on platform line endings.
 * The source is not modified, so publishing preserves the package's README.
 */
export function assertPackageReadme(source: string, packageName: string): void {
  const withoutBom = source.replace(/^\uFEFF/, '')
  const firstLine = withoutBom.split(/\r\n|\n|\r/, 1)[0] ?? ''
  if (firstLine.trimEnd() !== `# ${packageName}`) throw new Error(`${packageName}: README.md must start with '# ${packageName}'; received ${JSON.stringify(firstLine.slice(0, 120))}`)
}