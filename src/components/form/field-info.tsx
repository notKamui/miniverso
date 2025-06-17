import { text } from '@/components/ui/typography'
import type { FieldApi } from '@tanstack/react-form'
import { AnimatePresence, motion } from 'motion/react'

type Field = FieldApi<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>

export function FieldInfo({ field }: { field: Field }) {
  return (
    <AnimatePresence>
      {field.state.meta.isTouched && field.state.meta.errors.length && (
        <motion.p
          key={`${field.name}Errors`}
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className={text({ variant: 'small', color: 'error' })}
        >
          {field.state.meta.errors.join(',')}
        </motion.p>
      )}
    </AnimatePresence>
  )
}
