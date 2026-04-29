// oxlint-disable unicorn/no-process-exit

import { runDatabaseMigrations } from './migrate'

await runDatabaseMigrations()
  .catch((error) => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  })
  .then(() => process.exit(0))
