import { env } from '../src/lib/env/server'

export async function runDatabaseMigrations() {
  const { default: postgres } = await import('postgres')
  const { sql } = await import('drizzle-orm')
  const { drizzle } = await import('drizzle-orm/postgres-js')
  const { migrate } = await import('drizzle-orm/postgres-js/migrator')

  const postgresClient = postgres(env.DATABASE_URL)
  const db = drizzle({ client: postgresClient })
  console.log('ℹ️ Running migrations...')
  await migrate(db, { migrationsFolder: './.drizzle' })
  console.log('✅ Migrations completed successfully.\n')

  console.log('ℹ️  Updating admin user roles...')
  await db.execute(
    sql`UPDATE "user" SET role = 'admin' WHERE email = ANY(ARRAY[${env.ADMIN_EMAILS}])`,
  )
  console.log('✅ Admin user roles updated successfully.\n')
}

if (import.meta.main) {
  await runDatabaseMigrations()
    .catch((error) => {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    })
    .then(() => process.exit(0))
}
