import { db } from '../src/server/db'

async function applyDatabaseMigrations() {
  console.log('Running migrations...')
  const { migrate } = await import('drizzle-orm/postgres-js/migrator')
  await migrate(db, { migrationsFolder: './.drizzle' })
  console.log('Migrations completed successfully.')
}

export default async () => {
  await applyDatabaseMigrations()
}

if (process.argv.includes('--migrate')) {
  await applyDatabaseMigrations()
}
