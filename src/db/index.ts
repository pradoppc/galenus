import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

// Use a placeholder URL at build time when DATABASE_URL is not set.
// The app will never actually execute DB queries during static analysis.
const connectionString = process.env.DATABASE_URL ?? 'postgresql://build:build@build/build'

const sql = neon(connectionString)
export const db = drizzle(sql, { schema })
