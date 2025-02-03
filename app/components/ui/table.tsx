import { cn } from '@app/utils/cn'
import type { WithRef } from '@common/utils/types'
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'

const Table = ({
  ref,
  className,
  ...props
}: WithRef<HTMLAttributes<HTMLTableElement>>) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn('w-full caption-bottom text-sm', className)}
      {...props}
    />
  </div>
)

const TableHeader = ({
  ref,
  className,
  ...props
}: WithRef<HTMLAttributes<HTMLTableSectionElement>>) => (
  <thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props} />
)

const TableBody = ({
  ref,
  className,
  ...props
}: WithRef<HTMLAttributes<HTMLTableSectionElement>>) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
)

const TableFooter = ({
  ref,
  className,
  ...props
}: WithRef<HTMLAttributes<HTMLTableSectionElement>>) => (
  <tfoot
    ref={ref}
    className={cn(
      'border-t bg-muted/50 font-medium last:[&>tr]:border-b-0',
      className,
    )}
    {...props}
  />
)

const TableRow = ({
  ref,
  className,
  ...props
}: WithRef<HTMLAttributes<HTMLTableRowElement>>) => (
  <tr
    ref={ref}
    className={cn(
      'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
      className,
    )}
    {...props}
  />
)

const TableHead = ({
  ref,
  className,
  ...props
}: WithRef<ThHTMLAttributes<HTMLTableCellElement>>) => (
  <th
    ref={ref}
    className={cn(
      'h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
      className,
    )}
    {...props}
  />
)

const TableCell = ({
  ref,
  className,
  ...props
}: WithRef<TdHTMLAttributes<HTMLTableCellElement>>) => (
  <td
    ref={ref}
    className={cn(
      'p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
      className,
    )}
    {...props}
  />
)

const TableCaption = ({
  ref,
  className,
  ...props
}: WithRef<HTMLAttributes<HTMLTableCaptionElement>>) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-muted-foreground text-sm', className)}
    {...props}
  />
)

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
