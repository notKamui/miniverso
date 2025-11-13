import { describe, expect, it } from 'bun:test'
import { Time } from '../../src/lib/utils/time'

describe('Time', () => {
  it('formatDuration formats HH:MM:SS with zero padding', () => {
    expect(Time.formatDuration(0)).toBe('00:00:00')
    expect(Time.formatDuration(1000)).toBe('00:00:01')
    expect(Time.formatDuration(61_000)).toBe('00:01:01')
    expect(Time.formatDuration(3_600_000)).toBe('01:00:00')
    // 10h 20m 23s
    expect(Time.formatDuration(37_223_000)).toBe('10:20:23')
  })

  it('now and from produce Time instances', () => {
    const t1 = Time.now()
    const t2 = Time.from(new Date())
    expect(t1).toBeInstanceOf(Time)
    expect(t2).toBeInstanceOf(Time)
  })

  it('from(null|undefined) yields current-time-based instance without throwing', () => {
    const t1 = Time.from(null)
    const t2 = Time.from(undefined)
    expect(t1).toBeInstanceOf(Time)
    expect(t2).toBeInstanceOf(Time)
  })

  it('shift adjusts date by the specified unit and amount', () => {
    const base = new Date('2024-02-28T10:00:00Z')
    const t = Time.from(base)
    expect(t.shift('days', 1).getDate().getUTCDate()).toBe(29)
    expect(t.shift('months', 1).getDate().getUTCMonth()).toBe(2) // March (0-based)
    expect(t.shift('years', 1).getDate().getUTCFullYear()).toBe(2025)
    expect(t.shift('hours', 2).getDate().getUTCHours()).toBe(12)
    expect(t.shift('minutes', 30).getDate().getUTCMinutes()).toBe(30)
    expect(t.shift('seconds', 5).getDate().getUTCSeconds()).toBe(5)
    expect(t.shift('milliseconds', 500).getDate().getUTCMilliseconds()).toBe(
      500,
    )
  })

  it('compare respects the granularity (type) by zeroing lower components', () => {
    const a = Time.from('2024-01-15T12:34:56Z')
    const b = Time.from('2024-01-15T12:34:55Z')
    expect(a.compare(b, 'milliseconds')).toBeGreaterThan(0)
    // With 'seconds', implementation only zeros milliseconds, so still different
    expect(a.compare(b, 'seconds')).toBeGreaterThan(0)
    // With 'minutes', implementation zeros seconds, so now equal
    expect(a.compare(b, 'minutes')).toBe(0)
    const c = Time.from('2024-01-14T12:34:56Z')
    expect(a.compare(c, 'days')).toBeGreaterThan(0)
    expect(a.compare(b, 'hours')).toBeGreaterThan(0)
    expect(a.compare(b, 'months')).toBeGreaterThan(0)
    expect(a.compare(b, 'years')).toBeGreaterThan(0)
  })

  it('formatDay returns Today for current date, otherwise localized date', () => {
    const today = Time.now()
    expect(today.formatDay()).toBe('Today')
    const other = Time.from('2020-01-01T12:00:00Z')
    const long = other.formatDay()
    const short = other.formatDay({ short: true })
    expect(long).toMatch(
      /Wednesday|Thursday|Friday|Saturday|Sunday|Monday|Tuesday/,
    )
    expect(short).not.toBe('Today')
  })

  it('formatDayNumber returns DD/MM/YYYY-like for en locale', () => {
    const t = Time.from('2020-01-02T00:00:00Z')
    const s = t.formatDayNumber()
    expect(s).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('formatTime renders HH:MM[:SS] in 24h based on options', () => {
    const t = Time.from('2020-01-02T03:04:05Z')
    expect(t.formatTime()).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    expect(t.formatTime({ short: true })).toMatch(/^\d{2}:\d{2}$/)
  })

  it('formatDiff returns absolute difference formatted as HH:MM:SS', () => {
    const a = Time.from('2020-01-01T00:00:00Z')
    const b = Time.from('2020-01-01T01:02:03Z')
    expect(a.formatDiff(b)).toBe('01:02:03')
    expect(b.formatDiff(a)).toBe('01:02:03')
  })

  it('getRange returns start and end boundaries per range type', () => {
    const t = Time.from('2024-03-15T10:20:30Z')
    const [ws, we] = t.getRange('week')
    expect(ws.getDate().getUTCHours()).toBe(0)
    expect(ws.getDate().getUTCMinutes()).toBe(0)
    expect(we.getDate().getUTCHours()).toBe(23)
    expect(we.getDate().getUTCSeconds()).toBe(59)

    const [ms, me] = t.getRange('month')
    expect(ms.getDate().getUTCDate()).toBe(1)
    // End of month is the last day with 23:59:59.999
    const endDay = me.getDate().getUTCDate()
    expect(endDay).toBeGreaterThanOrEqual(28)

    const [ys, ye] = t.getRange('year')
    expect(ys.getDate().getUTCMonth()).toBe(0) // January
    expect(ye.getDate().getUTCMonth()).toBe(11) // December (end of year)
  })

  it('getRange week uses Monday as start and handles Sunday input', () => {
    const sunday = Time.from('2024-03-17T10:00:00Z') // Sunday
    const [ws, we] = sunday.getRange('week')
    // Monday start (00:00:00.000) and Sunday end (23:59:59.999)
    expect(ws.getDate().getUTCDay()).toBe(1) // Monday
    expect(ws.getDate().getUTCHours()).toBe(0)
    expect(we.getDate().getUTCDay()).toBe(0) // Sunday
    expect(we.getDate().getUTCHours()).toBe(23)
  })

  it('setDay and setTime update respective components', () => {
    const t = Time.from('2024-03-15T10:20:30Z')
    const newDay = new Date('2024-03-01T00:00:00Z')
    const updatedDay = t.setDay(newDay)
    expect(updatedDay.getDate().getUTCDate()).toBe(1)
    const updatedTime = t.setTime('08:30')
    expect(updatedTime.getDate().getUTCHours()).toBe(8)
    expect(updatedTime.getDate().getUTCMinutes()).toBe(30)
  })

  it('setDay accepts a Time instance as input', () => {
    const t = Time.from('2024-03-15T10:20:30Z')
    const other = Time.from('2024-04-10T00:00:00Z')
    const res = t.setDay(other)
    expect(res.getDate().getUTCFullYear()).toBe(2024)
    expect(res.getDate().getUTCMonth()).toBe(3) // April (0-based)
    expect(res.getDate().getUTCDate()).toBe(10)
  })

  it('getMonth returns 1-based month number', () => {
    const t = Time.from('2024-02-01T00:00:00Z')
    expect(t.getMonth()).toBe(2)
  })

  it('isToday returns false for non-today dates', () => {
    const t = Time.from('2000-01-01T00:00:00Z')
    expect(t.isToday()).toBe(false)
  })

  it('shift throws on unknown type (defensive default)', () => {
    const t = Time.from('2024-01-01T00:00:00Z')
    // @ts-expect-error force invalid input at runtime
    expect(() => t.shift('nope', 1)).toThrow('Unknown shift type')
  })

  it('toISOString returns a valid ISO string and adapter serializes/deserializes', () => {
    const t = Time.from('2024-01-01T00:00:00.000Z')
    const iso = t.toISOString()
    expect(iso).toBe('2024-01-01T00:00:00.000Z')
    const adapter = Time.serializationAdapter
    expect(adapter.test(t)).toBe(true)
    const serial = adapter.toSerializable(t)
    expect(serial).toBeInstanceOf(Date)
    const restored = adapter.fromSerializable(serial)
    expect(restored).toBeInstanceOf(Time)
    expect(restored.toISOString()).toBe(iso)
  })
})
