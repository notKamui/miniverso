export type Preset = 'today' | 'week' | 'month' | 'year' | 'lastYear'

export function getRange(preset: Preset): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)
  switch (preset) {
    case 'today': {
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
    }
    case 'week': {
      const d = now.getDay()
      const diff = d === 0 ? -6 : 1 - d
      start.setDate(now.getDate() + diff)
      start.setHours(0, 0, 0, 0)
      end.setTime(start.getTime())
      end.setDate(end.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      break
    }
    case 'month': {
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(start.getMonth() + 1, 0)
      end.setHours(23, 59, 59, 999)
      break
    }
    case 'year': {
      start.setMonth(0, 1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(11, 31)
      end.setHours(23, 59, 59, 999)
      break
    }
    case 'lastYear': {
      start.setFullYear(now.getFullYear() - 1, 0, 1)
      start.setHours(0, 0, 0, 0)
      end.setFullYear(now.getFullYear() - 1, 11, 31)
      end.setHours(23, 59, 59, 999)
      break
    }
  }
  return { start, end }
}
