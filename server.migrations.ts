import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

export default async function runMigrations() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.warn('[bunServer] DATABASE_URL not set; skipping migrations')
    return
  }
  const client = postgres(url)
  const db = drizzle({ client })
  console.log('[bunServer] ℹ️ Running migrations...')
  await migrate(db, { migrationsFolder: './.drizzle' })
  console.log('[bunServer] ✅ Migrations completed.')
}
