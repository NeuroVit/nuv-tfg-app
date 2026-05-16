import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatShortDate,
  toUserDayKey,
  userDayKeyToUtcDateKey,
  userDayStartInstant,
} from './datetime'

describe('datetime helpers', () => {
  it('returns empty string for invalid date values', () => {
    expect(formatDate('not-a-date', 'UTC')).toBe('')
    expect(formatDateTime('not-a-date', 'UTC')).toBe('')
    expect(formatShortDate('not-a-date', 'UTC')).toBe('')
    expect(toUserDayKey('not-a-date', 'UTC')).toBe('')
  })

  it('formats UTC day keys consistently', () => {
    const iso = '2026-01-02T12:34:56.000Z'
    expect(toUserDayKey(iso, 'UTC')).toBe('2026-01-02')
    expect(userDayKeyToUtcDateKey('2026-01-02', 'UTC')).toBe('2026-01-02')
  })

  it('computes start instant for a valid day key', () => {
    const start = userDayStartInstant('2026-01-02', 'UTC')
    expect(start).not.toBeNull()
    expect(start?.toISOString()).toBe('2026-01-02T00:00:00.000Z')
  })

  it('returns null for invalid day keys', () => {
    expect(userDayStartInstant('bad-key', 'UTC')).toBeNull()
    expect(userDayKeyToUtcDateKey('bad-key', 'UTC')).toBeNull()
  })

  it('supports granular options and default options', () => {
    const iso = '2026-01-02T12:34:56.000Z'
    const defaultFormatted = formatDateTime(iso, 'UTC')
    const granularFormatted = formatDateTime(iso, 'UTC', { hour: '2-digit', minute: '2-digit', hour12: false })

    expect(defaultFormatted.length).toBeGreaterThan(0)
    expect(granularFormatted).toMatch(/\d{2}:\d{2}/)
  })
})
