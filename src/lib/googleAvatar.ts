export const normalizeAvatarUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null

  const withScheme = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed

  try {
    const url = new URL(withScheme)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}
