import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://build:build@localhost/build'

// Em serverless (Vercel) cada invocação reutiliza a conexão via cache global.
// prepare:false é recomendado para ambientes serverless / pgbouncer.
const globalForDb = globalThis as unknown as { _pg?: ReturnType<typeof postgres> }

const client = globalForDb._pg ?? postgres(connectionString, {
  max:             5,
  idle_timeout:    20,
  connect_timeout: 15,
  prepare:         false,
})

if (process.env.NODE_ENV !== 'production') globalForDb._pg = client

export const db = drizzle(client, { schema })
