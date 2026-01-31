import type { ColumnDef } from '@tanstack/react-table'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useHydrated, useRouter } from '@tanstack/react-router'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
  PlusIcon,
  MoreVerticalIcon,
  Trash2Icon,
} from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { useState } from 'react'
import type { PartialExcept } from '@/lib/utils/types'
import type { TimeEntry } from '@/server/db/schema/time'
import { AddEntryDialog } from '@/components/apps/time/add-entry-dialog'
import { EditEntryDialog } from '@/components/apps/time/edit-entry-dialog'
import { TimeRecorderControls } from '@/components/apps/time/time-recorder-controls'
import { DataTable } from '@/components/data/data-table'
import { AnimatedButtonContent } from '@/components/ui/animated-spinner'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { useNow } from '@/lib/hooks/use-now'
import { createOptimisticMutationHelpers } from '@/lib/hooks/use-optimistic-mutation'
import { cn } from '@/lib/utils/cn'
import { Collection } from '@/lib/utils/collection'
import { Time } from '@/lib/utils/time'
import {
  $deleteTimeEntries,
  $updateTimeEntry,
  timeEntriesQueryKey,
  timeStatsQueryKey,
} from '@/server/functions/time-entry'

export type TimeTableData = Omit<TimeEntry, 'startedAt' | 'endedAt'> & {
  startedAt: string
  endedAt?: string
}

type RecorderDisplayProps = {
  time: Time
  entries: TimeEntry[]
  tzOffset: number
}

const timeTableColumns = (tzOffset: number): ColumnDef<TimeEntry>[] => [
  {
    accessorKey: 'startedAt',
    header: 'Started at',
    cell: ({ row }) => Time.from(row.original.startedAt).formatTime({ offsetMinutes: tzOffset }),
    size: 0, // force minimum width
  },
  {
    accessorKey: 'endedAt',
    header: 'Ended at',
    cell: ({ row }) =>
      row.original.endedAt
        ? Time.from(row.original.endedAt).formatTime({
            offsetMinutes: tzOffset,
          })
        : null,
    size: 0, // force minimum width
  },
  {
    accessorKey: 'description',
    header: 'Description',
    size: Number.MIN_SAFE_INTEGER, // force taking all available space
  },
]

const MotionDialog = m.create(EditEntryDialog)

export function RecorderDisplay({ time, entries, tzOffset }: RecorderDisplayProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selectedRows, setSelectedRows] = useState<Record<string, TimeEntry>>({})
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null)
  const [addEntryOpen, setAddEntryOpen] = useState(false)

  const helpers = createOptimisticMutationHelpers(
    queryClient,
    router,
    timeEntriesQueryKey,
    timeStatsQueryKey,
  )

  const updateMutation = useMutation({
    mutationFn: (entry: PartialExcept<TimeEntry, 'id'>) => $updateTimeEntry({ data: entry }),
    onMutate: async (variables) => {
      const context = await helpers.onMutate()
      queryClient.setQueriesData(
        { queryKey: timeEntriesQueryKey },
        (old: TimeEntry[] | undefined) =>
          old?.map((entry) => (entry.id === variables.id ? { ...entry, ...variables } : entry)),
      )
      return context
    },
    onError: helpers.onError,
    onSettled: helpers.onSettled,
  })

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => $deleteTimeEntries({ data: { ids } }),
    onMutate: async (ids) => {
      const context = await helpers.onMutate()
      queryClient.setQueriesData(
        { queryKey: timeEntriesQueryKey },
        (old: TimeEntry[] | undefined) => old?.filter((entry) => !ids.includes(entry.id)),
      )
      setSelectedRows({})
      return context
    },
    onError: helpers.onError,
    onSettled: helpers.onSettled,
  })

  const showDeleting = useDebounce(deleteMutation.isPending, 300)
  const dayBefore = time.shift('days', -1)
  const dayAfter = time.shift('days', 1)
  const isToday = time.isToday()

  async function onDateChange(time: Time) {
    await router.navigate({
      to: '/time/{-$day}',
      params: { day: time.isToday() ? undefined : time.formatDayKey() },
      search: { tz: time.getOffset() },
    })
  }

  const columnsWithActions: ReturnType<typeof timeTableColumns> = [
    {
      id: 'select',
      header: () => {
        const checked =
          (entries.length > 0 && entries.every((entry) => selectedRows[entry.id])) ||
          (Object.keys(selectedRows).length > 0 && 'indeterminate')
        return (
          <Checkbox
            checked={checked}
            onCheckedChange={(value) => {
              if (value) {
                setSelectedRows(Collection.associateBy(entries, (entry) => entry.id))
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
            checked={Boolean(selectedRows[entry.id])}
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
    ...timeTableColumns(tzOffset),
    {
      id: 'actions',
      cell: ({ row }) => {
        const entry = row.original

        return (
          <ActionsMenu
            onEdit={() => setSelectedEntry(entry)}
            onDelete={() => deleteMutation.mutate([entry.id])}
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
          <Button size="icon" className="h-9 rounded-r-none" asChild>
            <Link
              to="/time/{-$day}"
              from="/"
              params={{ day: dayBefore.formatDayKey() }}
              search={{ tz: dayBefore.getOffset() }}
            >
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
            <Button size="icon" className={cn('h-9 rounded-l-none')} disabled={isToday} asChild>
              <Link
                to="/time/{-$day}"
                from="/"
                params={{ day: dayAfter.formatDayKey() }}
                search={{ tz: dayAfter.getOffset() }}
              >
                <ChevronRightIcon />
              </Link>
            </Button>
          )}
        </div>
        <div className="flex flex-row items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddEntryOpen(true)}
            className="gap-2"
          >
            <PlusIcon className="size-4" />
            Add entry
          </Button>
          <TotalTime entries={entries} />
        </div>
      </div>
      <div className="flex flex-col-reverse gap-4 lg:flex-row">
        <div className="grow">
          <AnimatePresence>
            {Object.keys(selectedRows).length > 0 && (
              <m.div
                key="delete-rows"
                initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
                className="flex flex-row items-center gap-4"
              >
                <span>{Object.keys(selectedRows).length} selected</span>
                <Button
                  variant="destructive"
                  onClick={() => {
                    const ids = Object.values(selectedRows).map((e) => e.id)
                    deleteMutation.mutate(ids)
                  }}
                  disabled={deleteMutation.isPending}
                  className="min-w-20"
                >
                  <AnimatedButtonContent loading={showDeleting}>Delete</AnimatedButtonContent>
                </Button>
              </m.div>
            )}
          </AnimatePresence>
          <DataTable
            key={Object.keys(selectedRows).length}
            className="w-full"
            columns={columnsWithActions}
            data={entries}
            columnVisibilityStorageKey="time-recorder"
            onRowDoubleClick={(entry) => setSelectedEntry(entry)}
          />
        </div>

        {isToday && (
          <TimeRecorderControls
            className="max-h-min max-w-full lg:max-w-96 lg:min-w-96"
            entries={entries}
          />
        )}
      </div>

      <AnimatePresence>
        <MotionDialog
          key={selectedEntry?.id}
          transition={{ duration: 0.15 }}
          entry={selectedEntry}
          onEdit={(entry) => updateMutation.mutate(entry)}
          onClose={() => setSelectedEntry(null)}
        />
      </AnimatePresence>

      <AddEntryDialog
        key={addEntryOpen ? time.formatDayKey() : 'closed'}
        open={addEntryOpen}
        onOpenChange={setAddEntryOpen}
        defaultDate={time}
        tzOffset={tzOffset}
        onSuccess={async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: timeEntriesQueryKey }),
            queryClient.invalidateQueries({ queryKey: timeStatsQueryKey }),
          ])
        }}
      />
    </div>
  )
}

function ActionsMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Open action menu for row" variant="ghost" size="icon">
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
          <button type="button" className="w-full text-destructive" onClick={onDelete}>
            <Trash2Icon /> Delete
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TotalTime({ entries }: { entries: TimeEntry[] }) {
  const isHydrated = useHydrated()
  const now = useNow()?.getMillis()
  const totalTime = entries
    .filter((entry) => entry.endedAt)
    .reduce((acc, entry) => acc + entry.endedAt!.getMillis() - entry.startedAt.getMillis(), 0)
  const currentEntry = entries.find((entry) => !entry.endedAt)
  const currentElapsed =
    currentEntry && now ? Math.max(now - currentEntry.startedAt.getMillis(), 0) : 0

  return (
    entries.length > 0 && (
      <div className="flex h-9 flex-row items-center gap-2 rounded-md border px-4">
        <span className="font-extrabold">Total:</span>
        <AnimatePresence mode="wait">
          {isHydrated ? (
            <m.span
              key="total"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {Time.formatDuration(totalTime + currentElapsed)}
            </m.span>
          ) : (
            <m.span
              key="skeleton"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Skeleton className="mt-2 inline-block h-4 w-17" />
            </m.span>
          )}
        </AnimatePresence>
      </div>
    )
  )
}
