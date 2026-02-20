import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { text } from '@/components/ui/typography'
import type { ReactFormField } from '@/lib/utils/types'

export function FieldInfo({ field }: { field: ReactFormField }) {
  return (
    <AnimatePresence>
      {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
        <m.p
          key={`${field.name}Errors`}
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className={text({ variant: 'small', color: 'error' })}
        >
          {field.state.meta.errors.map(({ message }) => message as string).join(',')}
        </m.p>
      )}
    </AnimatePresence>
  )
}
