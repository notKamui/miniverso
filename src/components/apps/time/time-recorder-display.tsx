import { Link, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import type { ColumnDef } from '@tanstack/react-table'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
  MoreVerticalIcon,
  Trash2Icon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { EditEntryDialog } from '@/components/apps/time/edit-entry-dialog'
import { TimeRecorderControls } from '@/components/apps/time/time-recorder-controls'
import { DataTable } from '@/components/data/data-table'
import { Button } from '@/components/ui/button'
import { CalendarSelect } from '@/components/ui/calendar-select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNow } from '@/lib/hooks/use-now'
import { cn } from '@/lib/utils'
import { Collection } from '@/lib/utils/collection'
import { Time } from '@/lib/utils/time'
import type { TimeEntry } from '@/server/db/schema'
import {
  $deleteTimeEntries,
  $updateTimeEntry,
} from '@/server/functions/time-entry'

export type TimeTableData = Omit<TimeEntry, 'startedAt' | 'endedAt'> & {
  startedAt: string
  endedAt?: string
}

type RecorderDisplayProps = {
  time: Time
  entries: TimeEntry[]
}

const timeTableColumns: ColumnDef<TimeEntry>[] = [
  {
    accessorKey: 'startedAt',
    accessorFn: (row) => Time.from(row.startedAt).formatTime(),
    header: 'Started at',
    size: 0, // force minimum width
  },
  {
    accessorKey: 'endedAt',
    accessorFn: (row) =>
      row.endedAt ? Time.from(row.endedAt).formatTime() : null,
    header: 'Ended at',
    size: 0, // force minimum width
  },
  {
    accessorKey: 'description',
    header: 'Description',
    size: Number.MIN_SAFE_INTEGER, // force taking all available space
  },
]

const MotionDialog = motion.create(EditEntryDialog)

export function RecorderDisplay({ time, entries }: RecorderDisplayProps) {
  const router = useRouter()
  const updateEntry = useServerFn($updateTimeEntry)
  const deleteEntries = useServerFn($deleteTimeEntries)

  const dayBefore = time.shift('days', -1)
  const dayAfter = time.shift('days', 1)
  const isToday = time.isToday()

  function onDateChange(time: Time) {
    if (time.isToday()) return router.navigate({ to: '/time' })
    router.navigate({
      to: '/time/$day',
      params: { day: time.toISOString() },
    })
  }

  const [selectedRows, setSelectedRows] = useState<Record<string, TimeEntry>>(
    {},
  )
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null)

  const columnsWithActions: typeof timeTableColumns = [
    {
      id: 'select',
      header: () => {
        const checked =
          (entries.length > 0 &&
            entries.every((entry) => selectedRows[entry.id])) ||
          (Object.keys(selectedRows).length > 0 && 'indeterminate')
        return (
          <Checkbox
            checked={checked}
            onCheckedChange={(value) => {
              if (value) {
                setSelectedRows(
                  Collection.associateBy(entries, (entry) => entry.id),
                )
              } else {
                setSelectedRows({})
              }
            }}
            aria-label="Select all rows"
          />
        )
      },
      cell: ({ row }) => {
        const entry = row.original
        return (
          <Checkbox
            checked={!!selectedRows[entry.id]}
            onCheckedChange={(value) => {
              if (value) {
                setSelectedRows((prev) => ({ ...prev, [entry.id]: entry }))
              } else {
                setSelectedRows((prev) => {
                  const { [entry.id]: _, ...rest } = prev
                  return rest
                })
              }
            }}
            aria-label={`Select row ${entry.id}`}
          />
        )
      },
      size: 32,
    },
    ...timeTableColumns,
    {
      id: 'actions',
      cell: ({ row }) => {
        const entry = row.original

        return (
          <ActionsMenu
            onEdit={() => setSelectedEntry(entry)}
            onDelete={async () => {
              await deleteEntries({ data: { ids: [entry.id] } })
              await router.invalidate()
            }}
          />
        )
      },
      size: 50, // force minimum width
    },
  ]

  return (
    <div className="flex size-full flex-col gap-4">
      <div className="flex flex-row gap-4 max-sm:flex-col">
        <div className="flex flex-row items-center">
          <Button size="icon" className="h-[36px] rounded-r-none" asChild>
            <Link to="/time/$day" params={{ day: dayBefore.toISOString() }}>
              <ChevronLeftIcon />
            </Link>
          </Button>
          <CalendarSelect
            value={time.getDate()}
            onChange={(date) => onDateChange(Time.from(date))}
            className={cn(isToday ? 'rounded-l-none' : 'rounded-none')}
          />
          <h3 className="sr-only">{time.formatDay()}</h3>
          {!isToday && (
            <Button
              size="icon"
              className={cn('h-[36px] rounded-l-none')}
              disabled={isToday}
              asChild
            >
              <Link to="/time/$day" params={{ day: dayAfter.toISOString() }}>
                <ChevronRightIcon />
              </Link>
            </Button>
          )}
        </div>
        <TotalTime entries={entries} />
      </div>
      <div className="flex flex-col-reverse gap-4 lg:flex-row">
        <div className="grow">
          <AnimatePresence>
            {Object.keys(selectedRows).length > 0 && (
              <motion.div
                key="delete-rows"
                initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
                className="flex flex-row items-center gap-4"
              >
                <span>{Object.keys(selectedRows).length} selected</span>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    setSelectedRows({})
                    await deleteEntries({
                      data: {
                        ids: Object.values(selectedRows).map((e) => e.id),
                      },
                    })
                    await router.invalidate()
                  }}
                >
                  Delete
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          <DataTable
            key={Object.keys(selectedRows).length}
            className="w-full"
            columns={columnsWithActions}
            data={entries}
            onRowDoubleClick={(entry) => setSelectedEntry(entry)}
          />
        </div>

        {isToday && (
          <TimeRecorderControls
            className="max-h-96 min-h-96 max-w-full lg:min-w-96 lg:max-w-96"
            entries={entries}
          />
        )}
      </div>

      <AnimatePresence>
        <MotionDialog
          key={selectedEntry?.id}
          transition={{ duration: 0.15 }}
          entry={selectedEntry}
          onEdit={async (entry) => {
            await updateEntry({ data: entry })
            await router.invalidate()
          }}
          onClose={() => setSelectedEntry(null)}
        />
      </AnimatePresence>
    </div>
  )
}

function ActionsMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Open action menu for row"
          variant="ghost"
          size="icon"
        >
          <MoreVerticalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <button type="button" className="w-full" onClick={onEdit}>
            <EditIcon /> Edit
          </button>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <button
            type="button"
            className="w-full text-destructive"
            onClick={onDelete}
          >
            <Trash2Icon /> Delete
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TotalTime({ entries }: { entries: TimeEntry[] }) {
  const now = useNow().getDate().getTime()
  const totalTime = entries
    .filter((entry) => entry.endedAt)
    .reduce(
      (acc, entry) =>
        acc + entry.endedAt!.getTime() - entry.startedAt.getTime(),
      0,
    )
  const currentEntry = entries.find((entry) => !entry.endedAt)
  const currentElapsed = currentEntry
    ? Math.max(now - currentEntry.startedAt.getTime(), 0)
    : 0

  return (
    entries.length > 0 && (
      <div className="flex h-[36px] flex-row items-center gap-2 rounded-md border px-4">
        <span className="font-extrabold">Total:</span>
        <span>{Time.formatTime(totalTime + currentElapsed)}</span>
      </div>
    )
  )
}
