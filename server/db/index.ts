import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'

const config = useRuntimeConfig()

const client = createClient({
  url: config.tursoDbUrl || process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: config.tursoAuthToken || process.env.TURSO_AUTH_TOKEN
})

export const db = drizzle(client)
