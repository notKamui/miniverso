import { Slot } from '@radix-ui/react-slot'
import { ChevronRight, MoreHorizontal } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

const Breadcrumb = ({
  ref,
  ...props
}: ComponentProps<'nav'> & {
  separator?: ReactNode
}) => <nav ref={ref} aria-label="breadcrumb" {...props} />

const BreadcrumbList = ({ ref, className, ...props }: ComponentProps<'ol'>) => (
  <ol
    ref={ref}
    className={cn(
      'flex flex-wrap items-center gap-1.5 break-words text-muted-foreground text-sm sm:gap-2.5',
      className,
    )}
    {...props}
  />
)

const BreadcrumbItem = ({ ref, className, ...props }: ComponentProps<'li'>) => (
  <li
    ref={ref}
    className={cn('inline-flex items-center gap-1.5', className)}
    {...props}
  />
)

const BreadcrumbLink = ({
  ref,
  asChild,
  className,
  ...props
}: ComponentProps<'a'> & {
  asChild?: boolean
}) => {
  const Comp = asChild ? Slot : 'a'

  return (
    <Comp
      ref={ref}
      className={cn('transition-colors hover:text-foreground', className)}
      {...props}
    />
  )
}

const BreadcrumbPage = ({
  ref,
  className,
  ...props
}: ComponentProps<'span'>) => (
  <span
    tabIndex={-1}
    ref={ref}
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn('font-normal text-foreground', className)}
    {...props}
  />
)

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: ComponentProps<'li'>) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn('[&>svg]:h-3.5 [&>svg]:w-3.5', className)}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
)

const BreadcrumbEllipsis = ({
  className,
  ...props
}: ComponentProps<'span'>) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn('flex h-9 w-9 items-center justify-center', className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
)

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
}
