import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { ilike, or, eq, sql, desc } from 'drizzle-orm'
import * as schema from '../db/schema'

const conn = neon(process.env.DATABASE_URL!)
const db   = drizzle(conn, { schema })

async function main() {
  const q = 'metformina'

  // 1. Simple query without haversine
  try {
    const rows = await db
      .select({ nome: schema.farmacias.nome, produto: schema.medicamentos.produto, qtd: schema.estoques.quantidade })
      .from(schema.estoques)
      .innerJoin(schema.farmacias,    eq(schema.estoques.farmaciaId,    schema.farmacias.id))
      .innerJoin(schema.medicamentos, eq(schema.estoques.medicamentoId, schema.medicamentos.id))
      .where(or(
        ilike(schema.medicamentos.produto,        `%${q}%`),
        ilike(schema.medicamentos.principioAtivo, `%${q}%`)
      ))
      .limit(3)
    console.log('✓ Query simples OK — rows:', rows.length, rows)
  } catch (e) {
    console.error('✗ Query simples falhou:', (e as Error).message)
  }

  // 2. Query com haversine
  const lat = -23.55, lng = -46.63, raio = 10
  try {
    const rows = await db
      .select({
        nome: schema.farmacias.nome,
        dist: sql<number>`(6371 * acos(cos(radians(${lat})) * cos(radians(CAST(${schema.farmacias.latitude} AS float))) * cos(radians(CAST(${schema.farmacias.longitude} AS float)) - radians(${lng})) + sin(radians(${lat})) * sin(radians(CAST(${schema.farmacias.latitude} AS float)))))`,
      })
      .from(schema.estoques)
      .innerJoin(schema.farmacias,    eq(schema.estoques.farmaciaId,    schema.farmacias.id))
      .innerJoin(schema.medicamentos, eq(schema.estoques.medicamentoId, schema.medicamentos.id))
      .where(or(
        ilike(schema.medicamentos.produto,        `%${q}%`),
        ilike(schema.medicamentos.principioAtivo, `%${q}%`)
      ))
      .orderBy(desc(schema.estoques.quantidade))
      .limit(3)
    console.log('✓ Query com haversine OK — rows:', rows.length)
  } catch (e) {
    console.error('✗ Query com haversine falhou:', (e as Error).message)
  }
}

main().catch(console.error)
