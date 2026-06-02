import type { Metadata } from 'next'
import Link from 'next/link'
import { BRAND } from '@/lib/design-tokens'
import { JsonLd } from '@/components/seo/JsonLd'
import { db } from '@/db'
import { etlLogs } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { AccessibilityToggle } from '@/components/AccessibilityToggle'

export const metadata: Metadata = {
  title:       'Galenus — Porque saúde começa com acesso',
  description: 'Encontre medicamentos gratuitos nas farmácias do governo perto de você. Farmácia Popular, RENAME e componente especializado.',
  alternates:  { canonical: BRAND.url },
}

async function getLastSync() {
  try {
    const [row] = await db.select({ iniciadoEm: etlLogs.iniciadoEm })
      .from(etlLogs)
      .where(eq(etlLogs.status, 'success'))
      .orderBy(desc(etlLogs.iniciadoEm))
      .limit(1)
    return row?.iniciadoEm ?? null
  } catch {
    return null
  }
}

export default async function HomePage() {
  const lastSync = await getLastSync()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type':    'WebApplication',
    name:              BRAND.name,
    alternateName:     BRAND.fullName,
    url:               BRAND.url,
    description:       BRAND.description,
    applicationCategory: 'HealthApplication',
    operatingSystem:   'Web, Android, iOS',
    inLanguage:        'pt-BR',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL', availability: 'https://schema.org/InStock' },
    featureList: [
      'Busca por geolocalização GPS',
      'Mapa interativo de farmácias',
      'Filtro por programa de saúde',
      'Indicador de estoque em tempo real',
      'Disponível como app (PWA)',
    ],
    publisher: { '@type': 'Organization', name: BRAND.name, url: BRAND.url },
  }

  return (
    <>
      <JsonLd data={jsonLd} />
      <main className="flex flex-col min-h-screen max-w-[640px] mx-auto px-5">
        {/* Header */}
        <header className="flex items-center justify-between py-4">
          <AccessibilityToggle />
          <Link
            href="/login"
            className="text-[16px] text-[#5B8C7A] hover:text-[#1A4D3A] transition-colors"
            aria-label="Entrar ou cadastrar"
          >
            Entrar
          </Link>
        </header>

        {/* Hero */}
        <section className="flex-1 flex flex-col justify-center items-center text-center py-12 gap-6">
          <div>
            <h1
              className="text-[52px] font-medium leading-none"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary)' }}
            >
              Galenus
            </h1>
            <p
              className="mt-2 text-[20px]"
              style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-display)' }}
            >
              Porque saúde começa com acesso
            </p>
          </div>

          <p className="text-[18px] text-[#2D4A3E] max-w-[480px] leading-relaxed">
            Encontre medicamentos gratuitos nas farmácias do governo perto de você — Farmácia Popular, RENAME e componente especializado.
          </p>

          <Link
            href="/buscar"
            className="flex items-center justify-center h-[60px] px-10 text-[20px] font-medium rounded-[10px] bg-[#1A4D3A] text-[#EAF3EE] hover:bg-[#133B2C] transition-colors w-full max-w-[360px] focus:outline-none focus:ring-2 focus:ring-[#1A4D3A] focus:ring-offset-2"
            aria-label="Ir para busca de medicamentos"
          >
            Buscar medicamento
          </Link>

          {lastSync && (
            <p className="text-[14px] text-[#9CB8B0]">
              Dados atualizados em{' '}
              {new Date(lastSync).toLocaleString('pt-BR', {
                day:    '2-digit',
                month:  '2-digit',
                year:   'numeric',
                hour:   '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </section>

        {/* Footer */}
        <footer className="py-4 text-center text-[14px] text-[#9CB8B0]">
          <p>Dados: <a href="https://bnafar.saude.gov.br" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#5B8C7A]">BNAFAR / Ministério da Saúde</a></p>
          <p className="mt-1">Serviço gratuito e independente.</p>
        </footer>
      </main>
    </>
  )
}
