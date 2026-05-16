import { describe, expect, it } from 'vitest'
import { normalizeAvatarUrl } from './googleAvatar'

describe('normalizeAvatarUrl', () => {
  it('returns null for invalid values', () => {
    expect(normalizeAvatarUrl(undefined)).toBeNull()
    expect(normalizeAvatarUrl(null)).toBeNull()
    expect(normalizeAvatarUrl('   ')).toBeNull()
    expect(normalizeAvatarUrl('undefined')).toBeNull()
    expect(normalizeAvatarUrl('null')).toBeNull()
    expect(normalizeAvatarUrl('ftp://example.com/a.png')).toBeNull()
  })

  it('normalizes protocol-relative urls', () => {
    expect(normalizeAvatarUrl('//example.com/a.png')).toBe('https://example.com/a.png')
  })

  it('keeps valid http(s) urls', () => {
    expect(normalizeAvatarUrl('https://example.com/a.png')).toBe('https://example.com/a.png')
    expect(normalizeAvatarUrl('http://example.com/a.png')).toBe('http://example.com/a.png')
  })
})
