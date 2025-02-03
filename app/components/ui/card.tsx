import { cn } from '@app/utils/cn'
import type { WithRef } from '@common/utils/types'
import type { HTMLAttributes } from 'react'

const Card = ({
  ref,
  className,
  ...props
}: WithRef<HTMLAttributes<HTMLDivElement>>) => (
  <div
    ref={ref}
    className={cn(
      'rounded-xl border bg-card text-card-foreground shadow-sm',
      className,
    )}
    {...props}
  />
)

const CardHeader = ({
  ref,
  className,
  ...props
}: WithRef<HTMLAttributes<HTMLDivElement>>) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
)

const CardTitle = ({
  ref,
  className,
  ...props
}: WithRef<HTMLAttributes<HTMLDivElement>>) => (
  <div
    ref={ref}
    className={cn('font-semibold leading-none tracking-tight', className)}
    {...props}
  />
)

const CardDescription = ({
  ref,
  className,
  ...props
}: WithRef<HTMLAttributes<HTMLDivElement>>) => (
  <div
    ref={ref}
    className={cn('text-muted-foreground text-sm', className)}
    {...props}
  />
)

const CardContent = ({
  ref,
  className,
  ...props
}: WithRef<HTMLAttributes<HTMLDivElement>>) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
)

const CardFooter = ({
  ref,
  className,
  ...props
}: WithRef<HTMLAttributes<HTMLDivElement>>) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
)

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
