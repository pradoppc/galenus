import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  numeric,
  integer,
  bigint,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const users = pgTable('users', {
  id:             uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name:           varchar('name', { length: 255 }).notNull(),
  email:          varchar('email', { length: 255 }).unique().notNull(),
  emailVerified:  timestamp('email_verified'),
  image:          text('image'),
  passwordHash:   varchar('password_hash', { length: 255 }),
  phone:          varchar('phone', { length: 20 }),
  role:           varchar('role', { length: 20 }).notNull().default('user'),
  active:         boolean('active').notNull().default(true),
  createdAt:      timestamp('created_at').default(sql`now()`),
  updatedAt:      timestamp('updated_at').default(sql`now()`),
})

export const accounts = pgTable('accounts', {
  userId:            uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:              varchar('type', { length: 255 }).notNull(),
  provider:          varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('providerAccountId', { length: 255 }).notNull(),
  refresh_token:     text('refresh_token'),
  access_token:      text('access_token'),
  expires_at:        integer('expires_at'),
  token_type:        varchar('token_type', { length: 255 }),
  scope:             varchar('scope', { length: 255 }),
  id_token:          text('id_token'),
  session_state:     varchar('session_state', { length: 255 }),
})

export const sessions = pgTable('sessions', {
  sessionToken: varchar('sessionToken', { length: 255 }).notNull().primaryKey(),
  userId:       uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires:      timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable('verification_tokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token:      varchar('token', { length: 255 }).notNull(),
  expires:    timestamp('expires', { mode: 'date' }).notNull(),
})

export const farmacias = pgTable('farmacias', {
  id:        uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  cnes:      varchar('cnes', { length: 20 }).unique(),
  nome:      varchar('nome', { length: 255 }).notNull(),
  fantasia:  varchar('fantasia', { length: 255 }),
  municipio: varchar('municipio', { length: 255 }).notNull(),
  uf:        varchar('uf', { length: 2 }).notNull(),
  bairro:    varchar('bairro', { length: 255 }),
  endereco:  text('endereco'),
  latitude:  numeric('latitude', { precision: 10, scale: 7 }),
  longitude: numeric('longitude', { precision: 10, scale: 7 }),
  programa:  varchar('programa', { length: 255 }),
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`),
}, (table) => ({
  ufMunicipioIdx: index('farmacias_uf_municipio_idx').on(table.uf, table.municipio),
  coordsIdx:      index('farmacias_coords_idx').on(table.latitude, table.longitude),
}))

export const medicamentos = pgTable('medicamentos', {
  id:              uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  principioAtivo:  varchar('principio_ativo', { length: 500 }).notNull(),
  produto:         varchar('produto', { length: 500 }).notNull(),
  apresentacao:    varchar('apresentacao', { length: 500 }),
  codigoCatmat:    varchar('codigo_catmat', { length: 50 }).unique(),
  programa:        varchar('programa', { length: 255 }),
  createdAt:       timestamp('created_at').default(sql`now()`),
})

export const estoques = pgTable('estoques', {
  id:             uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  farmaciaId:     uuid('farmacia_id').notNull().references(() => farmacias.id),
  medicamentoId:  uuid('medicamento_id').notNull().references(() => medicamentos.id),
  quantidade:     bigint('quantidade', { mode: 'number' }).notNull().default(0),
  atualizadoEm:   timestamp('atualizado_em').notNull(),
  sincronizadoEm: timestamp('sincronizado_em').notNull().default(sql`now()`),
}, (table) => ({
  uniqueEstoque:  uniqueIndex('estoques_farmacia_medicamento_idx').on(table.farmaciaId, table.medicamentoId),
  medicamentoIdx: index('estoques_medicamento_idx').on(table.medicamentoId),
}))

export const etlLogs = pgTable('etl_logs', {
  id:                      uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  iniciadoEm:              timestamp('iniciado_em').notNull().default(sql`now()`),
  finalizadoEm:            timestamp('finalizado_em'),
  status:                  varchar('status', { length: 20 }),
  farmaciaProcessadas:     integer('farmacias_processadas').default(0),
  medicamentosProcessados: integer('medicamentos_processados').default(0),
  estoquesProcessados:     integer('estoques_processados').default(0),
  erroMensagem:            text('erro_mensagem'),
  fonte:                   varchar('fonte', { length: 50 }).default('cron'),
})
