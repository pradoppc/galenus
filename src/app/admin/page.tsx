import { db } from '@/db'
import { farmacias, medicamentos, estoques, etlLogs, users } from '@/db/schema'
import { count, desc, eq, sql } from 'drizzle-orm'
import { EtlTriggerButton } from '@/components/admin/EtlTriggerButton'
import { UserTable } from '@/components/admin/UserTable'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:  'Painel Admin — Galenus',
  robots: { index: false, follow: false },
}

async function getStats() {
  const [
    [farmaciaCount],
    [medCount],
    [estCount],
    logs,
    allUsers,
    lastSync,
  ] = await Promise.all([
    db.select({ count: count() }).from(farmacias),
    db.select({ count: count() }).from(medicamentos),
    db.select({ count: count() }).from(estoques).where(sql`quantidade > 0`),
    db.select().from(etlLogs).orderBy(desc(etlLogs.iniciadoEm)).limit(10),
    db.select().from(users).orderBy(desc(sql`created_at`)),
    db.select({ iniciadoEm: etlLogs.iniciadoEm }).from(etlLogs).where(eq(etlLogs.status, 'success')).orderBy(desc(etlLogs.iniciadoEm)).limit(1),
  ])

  return {
    farmaciaCount: farmaciaCount.count,
    medCount:      medCount.count,
    estCount:      estCount.count,
    logs,
    allUsers,
    lastSync: lastSync[0]?.iniciadoEm ?? null,
  }
}

export default async function AdminPage() {
  const stats = await getStats()

  const statCards = [
    { label: 'Farmácias',          value: stats.farmaciaCount },
    { label: 'Medicamentos',       value: stats.medCount },
    { label: 'Estoques ativos',    value: stats.estCount },
    { label: 'Última sincronização', value: stats.lastSync
        ? new Date(stats.lastSync).toLocaleString('pt-BR')
        : 'Nunca' },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-[28px] font-medium text-[#1A4D3A]">Painel Administrativo</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-[14px] border border-[#D4E8DF] p-4 shadow-[0_1px_4px_rgba(26,77,58,.08)]">
            <p className="text-[14px] text-[#5B8C7A]">{s.label}</p>
            <p className="text-[24px] font-medium text-[#1A4D3A] mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ETL */}
      <div className="bg-white rounded-[14px] border border-[#D4E8DF] p-6 shadow-[0_1px_4px_rgba(26,77,58,.08)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[22px] font-medium text-[#1A4D3A]">Sincronizações ETL</h2>
          <EtlTriggerButton />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[#5B8C7A] border-b border-[#D4E8DF]">
                <th className="pb-2 pr-4">Iniciado</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Farmácias</th>
                <th className="pb-2 pr-4">Medicamentos</th>
                <th className="pb-2 pr-4">Estoques</th>
                <th className="pb-2">Fonte</th>
              </tr>
            </thead>
            <tbody>
              {stats.logs.map((log) => (
                <tr key={log.id} className="border-b border-[#EAF3EE]">
                  <td className="py-2 pr-4">{new Date(log.iniciadoEm).toLocaleString('pt-BR')}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-[12px] font-medium ${
                      log.status === 'success' ? 'bg-[#EAF3EE] text-[#2B7A5A]'
                      : log.status === 'error' ? 'bg-[#FEF0F0] text-[#C04848]'
                      : 'bg-[#FEF3E2] text-[#C8893A]'
                    }`}>{log.status}</span>
                  </td>
                  <td className="py-2 pr-4">{log.farmaciaProcessadas ?? 0}</td>
                  <td className="py-2 pr-4">{log.medicamentosProcessados ?? 0}</td>
                  <td className="py-2 pr-4">{log.estoquesProcessados ?? 0}</td>
                  <td className="py-2">{log.fonte}</td>
                </tr>
              ))}
              {stats.logs.length === 0 && (
                <tr><td colSpan={6} className="py-4 text-center text-[#9CB8B0]">Nenhuma sincronização ainda</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users */}
      <UserTable users={stats.allUsers} />
    </div>
  )
}
