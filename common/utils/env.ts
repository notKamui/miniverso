import dotenv from '@dotenvx/dotenvx'

dotenv.config({
  path: '.env',
  override: true,
  quiet: true,
})

export const env = {
  NODE_ENV: process.env.NODE_ENV! as 'development' | 'production',
  SERVER_URL: process.env.SERVER_URL! as string,
  DATABASE_URL: process.env.DATABASE_URL! as string,
  DISABLE_CSRF: process.env.DISABLE_CSRF === 'true',
  DISABLE_RATE_LIMIT: process.env.DISABLE_RATE_LIMIT === 'true',
}
