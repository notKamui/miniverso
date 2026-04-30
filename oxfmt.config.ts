import type { OxfmtConfig } from 'vite-plus/fmt'

export default {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: true,
  arrowParens: 'always',
  bracketSpacing: true,
  endOfLine: 'lf',
  sortImports: { newlinesBetween: false },
  sortTailwindcss: {
    stylesheet: './src/styles.css',
    attributes: ['classnames', 'classNames', 'className', 'clsx', 'class'],
    functions: ['clsx', 'cn', 'cva'],
    preserveWhitespace: true,
  },
  ignorePatterns: [
    '**/node_modules/**',
    '**/pnpm-lock.yaml',
    '**/src/routeTree.gen.ts',
    '**/.drizzle/**',
    '**/dist/**',
  ],
} satisfies OxfmtConfig
