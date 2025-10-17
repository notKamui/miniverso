import { createSerializationAdapter } from '@tanstack/react-router'

export type ShiftType =
  | 'years'
  | 'months'
  | 'days'
  | 'hours'
  | 'minutes'
  | 'seconds'
  | 'milliseconds'

export type RangeType = 'day' | 'week' | 'month' | 'year'

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

  static from(date: Date | string | null | undefined): Time {
    if (date === null || date === undefined) {
      return new Time(new Date())
    }
    return new Time(new Date(date))
  }

  shift(type: ShiftType, count: number): Time {
    const date = new Date(this.date)
    switch (type) {
      case 'years':
        date.setFullYear(date.getFullYear() + count)
        break
      case 'months':
        date.setMonth(date.getMonth() + count)
        break
      case 'days':
        date.setDate(date.getDate() + count)
        break
      case 'hours':
        date.setHours(date.getHours() + count)
        break
      case 'minutes':
        date.setMinutes(date.getMinutes() + count)
        break
      case 'seconds':
        date.setSeconds(date.getSeconds() + count)
        break
      case 'milliseconds':
        date.setMilliseconds(date.getMilliseconds() + count)
        break
      default:
        throw new Error('Unknown shift type')
    }
    return new Time(date)
  }

  compare(other: Time, type: ShiftType = 'milliseconds'): number {
    const date = new Date(this.date)
    const otherDate = new Date(other.date)

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

  formatTime(options?: { short?: boolean }): string {
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

  static adapter = createSerializationAdapter({
    key: 'Time',
    test: (v) => v instanceof Time,
    toSerializable: (v) => v.getDate(),
    fromSerializable: (v) => Time.from(v),
  })
}
