import { createSerializationAdapter } from '@tanstack/react-router'
import { customType } from 'drizzle-orm/pg-core'
import * as z from 'zod'
import { createFallthroughExec } from '@/lib/utils/fallthrough'

export type ShiftType =
  | 'years'
  | 'months'
  | 'days'
  | 'hours'
  | 'minutes'
  | 'seconds'
  | 'milliseconds'

export type RangeType = 'day' | 'week' | 'month' | 'year'

export type YMD = { y: number; m: number; d: number }
export type DayKey = `${string}-${string}-${string}`

const CLASS_NAME = 'Time'
export class Time {
  private constructor(private readonly date: Date) {}

  static formatDuration(ms: number) {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    const paddedHours = String(hours).padStart(2, '0')
    const paddedMinutes = String(minutes).padStart(2, '0')
    const paddedSeconds = String(seconds).padStart(2, '0')
    return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`
  }

  static now(): Time {
    return new Time(new Date())
  }

  static from(date: Time | Date | string | null | undefined): Time {
    if (date === null || date === undefined) {
      return new Time(new Date())
    }
    return new Time(date instanceof Time ? date.getDate() : new Date(date))
  }

  static readonly serializationAdapter = createSerializationAdapter({
    key: CLASS_NAME,
    test: (v) => v instanceof Time,
    toSerializable: (v) => v.getDate(),
    fromSerializable: (v) => Time.from(v),
  })

  static readonly schema = z.custom<Time>((value) => value instanceof Time, {
    error: `Invalid ${CLASS_NAME} instance`,
  })

  static readonly column = customType<{
    data: Time
    driverData: string
  }>({
    dataType: () => 'timestamp with time zone',
    fromDriver: (date) => Time.from(date),
    toDriver: (time) => time.toISOString(),
  })

  static getOffset(): number {
    return new Date().getTimezoneOffset()
  }

  getOffset(): number {
    return this.date.getTimezoneOffset()
  }

  shift(type: ShiftType, count: number): Time {
    const date = new Date(this.date)
    switch (type) {
      case 'years': {
        date.setFullYear(date.getFullYear() + count)
        break
      }
      case 'months': {
        date.setMonth(date.getMonth() + count)
        break
      }
      case 'days': {
        date.setDate(date.getDate() + count)
        break
      }
      case 'hours': {
        date.setHours(date.getHours() + count)
        break
      }
      case 'minutes': {
        date.setMinutes(date.getMinutes() + count)
        break
      }
      case 'seconds': {
        date.setSeconds(date.getSeconds() + count)
        break
      }
      case 'milliseconds': {
        date.setMilliseconds(date.getMilliseconds() + count)
        break
      }
      default: {
        throw new Error('Unknown shift type')
      }
    }
    return new Time(date)
  }

  compare(other: Time | Date, type: ShiftType = 'milliseconds'): number {
    const date = new Date(this.date)
    const otherDate = new Date(other instanceof Time ? other.date : other)

    if (type === 'years') {
      date.setMonth(0)
      otherDate.setMonth(0)
    }
    if (type === 'months') {
      date.setDate(0)
      otherDate.setDate(0)
    }
    if (type === 'days') {
      date.setHours(0)
      otherDate.setHours(0)
    }
    if (type === 'hours') {
      date.setMinutes(0)
      otherDate.setMinutes(0)
    }
    if (type === 'minutes') {
      date.setSeconds(0)
      otherDate.setSeconds(0)
    }
    if (type === 'seconds') {
      date.setMilliseconds(0)
      otherDate.setMilliseconds(0)
    }

    return date.getTime() - otherDate.getTime()
  }

  isBefore(other: Time | Date, type: ShiftType = 'milliseconds'): boolean {
    return this.compare(other, type) < 0
  }

  isAfter(other: Time | Date, type: ShiftType = 'milliseconds'): boolean {
    return this.compare(other, type) > 0
  }

  isEqual(other: Time | Date, type: ShiftType = 'milliseconds'): boolean {
    return this.compare(other, type) === 0
  }

  toISOString(): string {
    return new Date(this.date).toISOString()
  }

  isToday(): boolean {
    const today = new Date()
    return (
      this.date.getDate() === today.getDate() &&
      this.date.getMonth() === today.getMonth() &&
      this.date.getFullYear() === today.getFullYear()
    )
  }

  formatDay(options?: { short?: boolean }): string {
    if (this.isToday()) return 'Today'
    return options?.short
      ? this.date.toLocaleDateString(['en'], {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : this.date.toLocaleDateString(['en'], {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
  }

  formatDayNumber(): string {
    return this.date.toLocaleDateString(['en'], {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  formatDayKey(): DayKey {
    const year = this.date.getFullYear()
    const month = String(this.date.getMonth() + 1).padStart(2, '0')
    const day = String(this.date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  formatTime(options?: { short?: boolean; offsetMinutes?: number }): string {
    if (options?.offsetMinutes !== undefined) {
      const utcMillis = this.date.getTime()
      const offsetMillis = options.offsetMinutes * 60 * 1000
      const localDate = new Date(utcMillis - offsetMillis)

      const hours = String(localDate.getUTCHours()).padStart(2, '0')
      const minutes = String(localDate.getUTCMinutes()).padStart(2, '0')
      const seconds = String(localDate.getUTCSeconds()).padStart(2, '0')

      return options.short ? `${hours}:${minutes}` : `${hours}:${minutes}:${seconds}`
    }

    return this.date.toLocaleTimeString(['en'], {
      hour: '2-digit',
      minute: '2-digit',
      second: options?.short ? undefined : '2-digit',
      hour12: false,
    })
  }

  // HH:MM:SS
  formatDiff(other: Time): string {
    const diff = Math.abs(this.compare(other, 'milliseconds'))
    return Time.formatDuration(diff)
  }

  getDate(): Date {
    return new Date(this.date)
  }

  getMonth(): number {
    return this.date.getMonth() + 1
  }

  getMillis(): number {
    return this.date.getTime()
  }

  getRange(type: RangeType): [start: Time, end: Time] {
    const startDate = new Date(this.date)
    const endDate = new Date(this.date)
    switch (type) {
      case 'week': {
        const day = startDate.getDay()
        const diff = day === 0 ? -6 : 1 - day
        startDate.setDate(startDate.getDate() + diff)
        endDate.setDate(startDate.getDate() + 6)
        break
      }
      case 'month': {
        startDate.setDate(1)
        endDate.setMonth(startDate.getMonth() + 1)
        endDate.setDate(0)
        break
      }
      case 'year': {
        startDate.setMonth(0, 1)
        endDate.setFullYear(startDate.getFullYear() + 1)
        endDate.setMonth(0, 0)
        break
      }
    }
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)
    return [new Time(startDate), new Time(endDate)]
  }

  setDay(time: Date | Time): Time {
    const date = new Date(this.date)
    const target = time instanceof Date ? time : time.getDate()
    date.setFullYear(target.getFullYear())
    date.setMonth(target.getMonth())
    date.setDate(target.getDate())
    return new Time(date)
  }

  setTime(time: string): Time {
    const date = new Date(this.date)
    const [hours, minutes] = time.split(':').map(Number)
    date.setHours(hours)
    date.setMinutes(minutes)
    return new Time(date)
  }

  startOf(type: ShiftType): Time {
    const date = new Date(this.date)
    fallthroughStartOf(date, type)
    return new Time(date)
  }

  endOf(type: ShiftType): Time {
    const date = new Date(this.date)
    fallthroughEndOf(date, type)
    return new Time(date)
  }
}

// Helpers for converting a local calendar day (dayKey) into UTC instants.
// `tzOffsetMinutes` must match `Date.getTimezoneOffset()` semantics.
export namespace UTCTime {
  export function parseDayKey(dayKey: string): YMD {
    const [y, m, d] = dayKey.split('-').map(Number)
    if (!y || !m || !d) {
      throw new Error('Invalid dayKey')
    }
    return { y, m, d }
  }

  export function todayKey(tzOffsetMinutes: number): DayKey {
    const virtualNow = new Date(Date.now() - tzOffsetMinutes * 60 * 1000)
    const y = virtualNow.getUTCFullYear()
    const m = String(virtualNow.getUTCMonth() + 1).padStart(2, '0')
    const d = String(virtualNow.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  export function localDayRange(dayKey: string, tzOffsetMinutes: number) {
    const { y, m, d } = UTCTime.parseDayKey(dayKey)
    const offsetMs = tzOffsetMinutes * 60 * 1000
    return {
      start: Time.from(new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) + offsetMs)),
      end: Time.from(new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) + offsetMs)),
    }
  }

  export function at(dayKey: string, timeStr: string, tzOffsetMinutes: number): Time {
    const { start } = UTCTime.localDayRange(dayKey, tzOffsetMinutes)
    const [hours, minutes] = timeStr.split(':').map(Number)
    return start.shift('hours', hours).shift('minutes', minutes ?? 0)
  }

  export function localPeriodRange(
    dayKey: string,
    type: Exclude<RangeType, 'day'>,
    tzOffsetMinutes: number,
  ) {
    const { y, m, d } = UTCTime.parseDayKey(dayKey)
    const DAY_MS = 24 * 60 * 60 * 1000
    const offsetMs = tzOffsetMinutes * 60 * 1000

    let startYmd: YMD
    let endYmd: YMD

    switch (type) {
      case 'week': {
        const baseUtc = Date.UTC(y, m - 1, d)
        const weekday = new Date(baseUtc).getUTCDay() // 0..6 (Sun..Sat)
        const diffToMonday = weekday === 0 ? -6 : 1 - weekday
        const mondayUtc = baseUtc + diffToMonday * DAY_MS
        const sundayUtc = mondayUtc + 6 * DAY_MS
        startYmd = toYmd(mondayUtc)
        endYmd = toYmd(sundayUtc)
        break
      }
      case 'month': {
        startYmd = { y, m, d: 1 }
        endYmd = toYmd(Date.UTC(y, m, 0))
        break
      }
      case 'year': {
        startYmd = { y, m: 1, d: 1 }
        endYmd = toYmd(Date.UTC(y, 12, 0))
        break
      }
    }

    return {
      start: Time.from(
        new Date(Date.UTC(startYmd.y, startYmd.m - 1, startYmd.d, 0, 0, 0, 0) + offsetMs),
      ),
      end: Time.from(
        new Date(Date.UTC(endYmd.y, endYmd.m - 1, endYmd.d, 23, 59, 59, 999) + offsetMs),
      ),
    }
  }
}

const fallthroughStartOf = createFallthroughExec<ShiftType, Date>([
  ['years', (date) => date.setMonth(0)],
  ['months', (date) => date.setDate(1)],
  ['days', (date) => date.setHours(0)],
  ['hours', (date) => date.setMinutes(0)],
  ['minutes', (date) => date.setSeconds(0)],
  ['seconds', (date) => date.setMilliseconds(0)],
  ['milliseconds', () => {}],
])

const fallthroughEndOf = createFallthroughExec<ShiftType, Date>([
  ['years', (date) => date.setMonth(11)],
  [
    'months',
    (date) => date.setDate(new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()),
  ],
  ['days', (date) => date.setHours(23)],
  ['hours', (date) => date.setMinutes(59)],
  ['minutes', (date) => date.setSeconds(59)],
  ['seconds', (date) => date.setMilliseconds(999)],
  ['milliseconds', () => {}],
])

function toYmd(utcMs: number): YMD {
  const dt = new Date(utcMs)
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
  }
}
