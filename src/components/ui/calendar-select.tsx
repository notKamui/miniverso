import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Time } from '@/lib/utils/time'

export type CalendarSelectProps = {
  value?: Date
  onChange: (date?: Date) => void
  onBlur?: () => void
  className?: string
  ariaHidden?: boolean
}

export function CalendarSelect({
  value,
  onChange,
  onBlur,
  className,
  ariaHidden = false,
}: CalendarSelectProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-[280px] pl-3 text-left font-normal max-sm:grow',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          {value ? (
            Time.from(value).formatDay({ short: true })
          ) : (
            <span>Pick a date</span>
          )}
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        aria-hidden={ariaHidden}
      >
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          onDayBlur={onBlur}
          disabled={(date) =>
            date > new Date() || date < new Date('1900-01-01')
          }
        />
      </PopoverContent>
    </Popover>
  )
}
