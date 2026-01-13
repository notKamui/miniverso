import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import type { ComponentProps, ReactNode } from 'react'
import { Spinner } from '@/components/ui/spinner'

const fadeScale = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
  transition: { duration: 0.15 },
} as const

type AnimatedSpinnerProps = {
  show: boolean
}

export function AnimatedSpinner({ show }: AnimatedSpinnerProps) {
  return (
    <span className="inline-flex w-4 items-center justify-center">
      <AnimatePresence>
        {show && (
          <m.span key="spinner" {...fadeScale}>
            <Spinner />
          </m.span>
        )}
      </AnimatePresence>
    </span>
  )
}

type AnimatedButtonContentProps = {
  loading: boolean
  children: ReactNode
  spinnerProps?: ComponentProps<typeof Spinner>
}

export function AnimatedButtonContent({
  loading,
  children,
  spinnerProps,
}: AnimatedButtonContentProps) {
  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <m.span key="spinner" {...fadeScale}>
          <Spinner {...spinnerProps} />
        </m.span>
      ) : (
        <m.span
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {children}
        </m.span>
      )}
    </AnimatePresence>
  )
}
