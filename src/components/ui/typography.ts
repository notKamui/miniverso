import { cva } from 'class-variance-authority'

export const title = cva('scroll-m-20 tracking-tight', {
  variants: {
    h: {
      1: 'font-extrabold text-4xl lg:text-5xl',
      2: 'font-semibold text-3xl first:mt-0',
      3: 'font-semibold text-2xl',
      4: 'font-semibold text-xl',
    },
  },
})

export const text = cva('', {
  variants: {
    variant: {
      DEFAULT: '',
      small: 'text-sm',
      muted: 'text-muted-foreground text-sm',
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
