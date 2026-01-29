import { cva } from 'class-variance-authority'

export const title = cva('scroll-m-20 tracking-tight', {
  variants: {
    h: {
      1: 'text-4xl font-extrabold lg:text-5xl',
      2: 'text-3xl font-semibold first:mt-0',
      3: 'text-2xl font-semibold',
      4: 'text-xl font-semibold',
    },
  },
})

export const text = cva('', {
  variants: {
    variant: {
      DEFAULT: '',
      small: 'text-sm',
      muted: 'text-sm text-muted-foreground',
    },
    paragraphed: {
      true: 'space-y-6 leading-7',
      false: '',
    },
    color: {
      DEFAULT: 'text-primary',
      secondary: 'text-secondary',
      error: 'text-destructive',
    },
  },
  defaultVariants: {
    variant: 'DEFAULT',
    paragraphed: false,
    color: 'DEFAULT',
  },
})

export const link = cva('underline-offset-4 hover:underline', {
  variants: {
    color: {
      DEFAULT: 'text-blue-400 hover:text-blue-500',
      primary: 'text-primary hover:text-primary/90',
      secondary: 'text-secondary hover:text-secondary/90',
    },
  },
  defaultVariants: {
    color: 'DEFAULT',
  },
})
