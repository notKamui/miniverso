import { Button } from '@app/components/ui/button'
import { Calendar } from '@app/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@app/components/ui/popover'
import { cn } from '@app/utils/cn'
import { Time } from '@common/utils/time'
import { CalendarIcon } from 'lucide-react'

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
