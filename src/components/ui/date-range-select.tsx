import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils/cn'
import { type Preset, getRange } from '@/lib/utils/date-range'

const PRESET_LABELS: Record<Preset, string> = {
  today: 'Today',
  week: 'This week',
  month: 'This month',
  year: 'This year',
  lastYear: 'Last year',
}

const DEFAULT_PRESETS: Preset[] = ['today', 'week', 'month', 'year', 'lastYear']

export type DateRangeSelectProps = {
  startDate: string
  endDate: string
  onChange: (opts: { startDate: string; endDate: string }) => void
  presets?: Preset[]
  showPresets?: boolean
  className?: string
}

function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'short' })
}

export function DateRangeSelect({
  startDate,
  endDate,
  onChange,
  presets = DEFAULT_PRESETS,
  showPresets = true,
  className,
}: DateRangeSelectProps) {
  const from = startDate ? new Date(startDate) : undefined
  const to = endDate ? new Date(endDate) : undefined

  function handlePreset(p: Preset) {
    const { start, end } = getRange(p)
    onChange({ startDate: start.toISOString(), endDate: end.toISOString() })
  }

  function handleRangeSelect(range: { from?: Date; to?: Date } | undefined) {
    if (range?.from && range?.to) {
      onChange({
        startDate: range.from.toISOString(),
        endDate: range.to.toISOString(),
      })
    } else {
      onChange({ startDate: '', endDate: '' })
    }
  }

  const triggerLabel =
    startDate && endDate ? `${formatDate(startDate)} - ${formatDate(endDate)}` : 'Select date range'

  return (
    <div className={cn('flex flex-col gap-2 md:flex-row md:items-center', className)}>
      {showPresets && (
        <div className="grid grid-cols-2 gap-1">
          {presets.map((p, i) => (
            <Button
              key={p}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePreset(p)}
              className={cn(i === 0 && presets.length % 2 === 1 && 'col-span-2')}
            >
              {PRESET_LABELS[p]}
            </Button>
          ))}
        </div>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'min-w-[240px] justify-start gap-2 pl-3 text-left font-normal',
              !startDate && !endDate && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="size-4 opacity-50" />
            {triggerLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={from && to ? { from, to } : from ? { from, to: from } : undefined}
            onSelect={handleRangeSelect}
            numberOfMonths={2}
            disabled={(date) => date > new Date() || date < new Date('2000-01-01')}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
