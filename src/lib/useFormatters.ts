import { useMemo } from 'react'
import { formatDate, formatDateTime, formatShortDate, toUserDayKey, userTodayKey } from '@/lib/datetime'
import { useUserTimeZone } from '@/store/profileStore'

export function useFormatters() {
  const timeZone = useUserTimeZone()

  return useMemo(
    () => ({
      timeZone,
      formatDateTime: (iso: string | Date, opts?: Intl.DateTimeFormatOptions) => formatDateTime(iso, timeZone, opts),
      formatDate: (iso: string | Date) => formatDate(iso, timeZone),
      formatShortDate: (iso: string | Date) => formatShortDate(iso, timeZone),
      toUserDayKey: (iso: string | Date) => toUserDayKey(iso, timeZone),
      userTodayKey: () => userTodayKey(timeZone),
    }),
    [timeZone],
  )
}
