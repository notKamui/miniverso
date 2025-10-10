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
    const d = new Date(this.date)
    switch (type) {
      case 'years':
        d.setFullYear(d.getFullYear() + count)
        break
      case 'months':
        d.setMonth(d.getMonth() + count)
        break
      case 'days':
        d.setDate(d.getDate() + count)
        break
      case 'hours':
        d.setHours(d.getHours() + count)
        break
      case 'minutes':
        d.setMinutes(d.getMinutes() + count)
        break
      case 'seconds':
        d.setSeconds(d.getSeconds() + count)
        break
      case 'milliseconds':
        d.setMilliseconds(d.getMilliseconds() + count)
        break
      default:
        throw new Error('Unknown shift type')
    }
    return new Time(d)
  }

  compare(other: Time, type: ShiftType = 'milliseconds'): number {
    const a = new Date(this.date)
    const b = new Date(other.date)

    if (type === 'years') {
      a.setMonth(0)
      b.setMonth(0)
    }
    if (type === 'months') {
      a.setDate(0)
      b.setDate(0)
    }
    if (type === 'days') {
      a.setHours(0)
      b.setHours(0)
    }
    if (type === 'hours') {
      a.setMinutes(0)
      b.setMinutes(0)
    }
    if (type === 'minutes') {
      a.setSeconds(0)
      b.setSeconds(0)
    }
    if (type === 'seconds') {
      a.setMilliseconds(0)
      b.setMilliseconds(0)
    }

    return a.getTime() - b.getTime()
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
    const d = new Date(this.date)
    const target = time instanceof Date ? time : time.getDate()
    d.setFullYear(target.getFullYear())
    d.setMonth(target.getMonth())
    d.setDate(target.getDate())
    return new Time(d)
  }

  setTime(time: string): Time {
    const d = new Date(this.date)
    const [hours, minutes] = time.split(':').map(Number)
    d.setHours(hours)
    d.setMinutes(minutes)
    return new Time(d)
  }

  static adapter = createSerializationAdapter({
    key: 'Time',
    test: (v) => v instanceof Time,
    toSerializable: (v) => v.getDate(),
    fromSerializable: (v) => Time.from(v),
  })
}
