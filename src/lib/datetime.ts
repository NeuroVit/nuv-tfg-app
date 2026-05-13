const LOCALE = 'es-ES'

const getFormatter = (tz: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(LOCALE, { timeZone: tz, ...options })

export const formatDateTime = (
  iso: string | Date,
  tz: string,
  opts?: Intl.DateTimeFormatOptions,
): string => {
  const date = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(date.getTime())) return ''
  return getFormatter(tz, { dateStyle: 'medium', timeStyle: 'short', ...opts }).format(date)
}

export const formatDate = (iso: string | Date, tz: string): string => {
  const date = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(date.getTime())) return ''
  return getFormatter(tz, { dateStyle: 'short' }).format(date)
}

export const formatShortDate = (iso: string | Date, tz: string): string => {
  const date = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(date.getTime())) return ''
  return getFormatter(tz, { day: '2-digit', month: '2-digit' }).format(date)
}

const getDateParts = (date: Date, tz: string) => {
  const parts = getFormatter(tz, { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'
  return { year, month, day }
}

export const toUserDayKey = (iso: string | Date, tz: string): string => {
  const date = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(date.getTime())) return ''
  const { year, month, day } = getDateParts(date, tz)
  return `${year}-${month}-${day}`
}

export const userTodayKey = (tz: string): string => toUserDayKey(new Date(), tz)

const parseDayKey = (dayKey: string) => {
  const [yearRaw, monthRaw, dayRaw] = dayKey.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null
  }
  return { year, month, day }
}

export const userDayStartInstant = (dayKey: string, tz: string): Date | null => {
  const parsed = parseDayKey(dayKey)
  if (!parsed) return null

  const { year, month, day } = parsed
  let guess = Date.UTC(year, month - 1, day, 0, 0, 0)

  for (let i = 0; i < 4; i += 1) {
    const parts = getFormatter(tz, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date(guess))

    const pYear = Number(parts.find((part) => part.type === 'year')?.value ?? year)
    const pMonth = Number(parts.find((part) => part.type === 'month')?.value ?? month)
    const pDay = Number(parts.find((part) => part.type === 'day')?.value ?? day)
    const pHour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
    const pMinute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
    const pSecond = Number(parts.find((part) => part.type === 'second')?.value ?? 0)

    const obtained = Date.UTC(pYear, pMonth - 1, pDay, pHour, pMinute, pSecond)
    const desired = Date.UTC(year, month - 1, day, 0, 0, 0)
    const delta = obtained - desired
    if (delta === 0) break
    guess -= delta
  }

  const result = new Date(guess)
  return Number.isNaN(result.getTime()) ? null : result
}

export const userDayKeyToUtcDateKey = (dayKey: string, tz: string): string | null => {
  const instant = userDayStartInstant(dayKey, tz)
  if (!instant) return null
  return instant.toISOString().slice(0, 10)
}
