import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

export type SortableColumnHeaderProps<T extends string> = {
  column: T
  label: string
  activeOrderBy: T
  activeOrder: 'asc' | 'desc'
  onSort: (column: T, nextOrder: 'asc' | 'desc') => void
}

/**
 * Returns the next sort order when a column is clicked:
 * - If clicking the active column: toggles asc <-> desc
 * - If clicking another column: resets to asc
 */
function getNextSortOrder<T extends string>(
  activeOrderBy: T,
  activeOrder: 'asc' | 'desc',
  column: T,
): 'asc' | 'desc' {
  if (activeOrderBy === column) {
    return activeOrder === 'asc' ? 'desc' : 'asc'
  }
  return 'asc'
}

/**
 * Reusable sortable table column header: clickable label + order indicator.
 * Use with URL/search state: pass activeOrderBy and activeOrder from your
 * route search, and call onSort(column, nextOrder) to navigate with updated
 * orderBy, order, and typically page: 1.
 */
export function SortableColumnHeader<T extends string>({
  column,
  label,
  activeOrderBy,
  activeOrder,
  onSort,
}: SortableColumnHeaderProps<T>) {
  const nextOrder = getNextSortOrder(activeOrderBy, activeOrder, column)
  const isActive = activeOrderBy === column
  const ariaLabel = isActive
    ? `${label}, sorted ${activeOrder === 'asc' ? 'ascending' : 'descending'}`
    : undefined

  return (
    <button
      type="button"
      className="inline-flex items-center text-sm font-medium"
      onClick={() => onSort(column, nextOrder)}
      aria-label={ariaLabel}
    >
      {label}
      {!isActive && <ArrowUpDown className="ml-1 size-3.5 text-muted-foreground" aria-hidden />}
      {isActive && activeOrder === 'asc' && <ArrowUp className="ml-1 size-3.5" aria-hidden />}
      {isActive && activeOrder === 'desc' && <ArrowDown className="ml-1 size-3.5" aria-hidden />}
    </button>
  )
}
