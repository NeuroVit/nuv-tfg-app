import { describe, expect, it, vi } from 'vitest'
import {
  daysBetween,
  formatRelativeTime,
  getPreviousRangeBounds,
  getRangeBounds,
  isInRange,
  toInputDate,
} from './dashboardUtils'

describe('dashboard date helpers', () => {
  it('builds daily range bounds', () => {
    const ref = new Date('2026-05-15T13:00:00Z')
    const range = getRangeBounds('daily', ref)

    expect(range.start?.getHours()).toBe(0)
    expect(range.start?.getMinutes()).toBe(0)
    expect(range.end && range.start ? range.end.getTime() - range.start.getTime() : 0).toBe(24 * 60 * 60 * 1000)
  })

  it('builds weekly previous range', () => {
    const current = getRangeBounds('weekly', new Date('2026-05-15T13:00:00Z'))
    const previous = getPreviousRangeBounds('weekly', current)

    expect(previous.start).not.toBeNull()
    expect(previous.end).not.toBeNull()
    expect(daysBetween(previous.start!, previous.end!)).toBe(7)
  })

  it('checks date inclusion in range', () => {
    const start = new Date('2026-05-01T00:00:00Z')
    const end = new Date('2026-05-08T00:00:00Z')

    expect(isInRange(new Date('2026-05-03T10:00:00Z'), { start, end })).toBe(true)
    expect(isInRange(new Date('2026-05-08T10:00:00Z'), { start, end })).toBe(false)
  })

  it('serializes date to yyyy-mm-dd', () => {
    expect(toInputDate(new Date('2026-01-09T07:00:00Z'))).toBe('2026-01-09')
  })

  it('formats relative time for invalid dates safely', () => {
    expect(formatRelativeTime('invalid')).toBe('Hace 0 min')
  })

  it('formats relative time in minutes for recent events', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-15T12:30:00Z'))
    expect(formatRelativeTime('2026-05-15T12:20:00Z')).toBe('Hace 10 min')
    vi.useRealTimers()
  })
})
