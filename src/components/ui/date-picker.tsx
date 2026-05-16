import { CalendarIcon } from "lucide-react"
import { useState } from "react"
import type { Matcher } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type DatePickerProps = {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  timeZone?: string
  disabledDays?: Matcher | Matcher[]
  className?: string
  allowClear?: boolean
  clearLabel?: string
}

const dateLabelFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "long",
  year: "numeric",
})

export function parseDayKey(value?: string): Date | undefined {
  if (!value) return undefined

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return undefined
  }

  const parsed = new Date(year, month - 1, day)
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return undefined
  }

  return parsed
}

export function formatDayKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecciona una fecha",
  disabled = false,
  timeZone,
  disabledDays,
  className,
  allowClear = false,
  clearLabel = "Limpiar fecha",
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selectedDate = parseDayKey(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between rounded-lg border-input px-3 text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
        >
          {selectedDate ? dateLabelFormatter.format(selectedDate) : placeholder}
          <CalendarIcon className="h-4 w-4 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto gap-0 p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(nextDate) => {
            if (!nextDate) return
            onChange(formatDayKey(nextDate))
            setOpen(false)
          }}
          disabled={disabledDays}
          timeZone={timeZone}
        />
        {allowClear && selectedDate ? (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={() => {
                onChange("")
                setOpen(false)
              }}
            >
              {clearLabel}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
