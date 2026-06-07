import type { Metadata } from 'next'
import Link from 'next/link'
import { BRAND } from '@/lib/design-tokens'
import { JsonLd } from '@/components/seo/JsonLd'
import { db } from '@/db'
import { etlLogs } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { AccessibilityToggle } from '@/components/AccessibilityToggle'

// ISR: regenera a home a cada 30 min para que "Dados atualizados em" reflita
// a última sincronização do ETL (3x/dia) sem ficar congelado no build.
export const revalidate = 1800

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
        <footer className="py-6 text-center space-y-2">
          <p className="text-[14px] text-[#5B8C7A]">
            Dados públicos:{' '}
            <a href="https://bnafar.saude.gov.br" target="_blank" rel="noopener noreferrer"
              className="underline hover:text-[#1A4D3A]">
              BNAFAR / Ministério da Saúde
            </a>
          </p>
          <p className="text-[13px] text-[#9CB8B0] max-w-[480px] mx-auto leading-relaxed">
            O Galenus é uma ferramenta de utilidade pública, gratuita e independente,
            desenvolvida e mantida de forma voluntária para facilitar o acesso da
            população aos medicamentos do SUS.
          </p>
          <p className="text-[12px] text-[#9CB8B0] max-w-[480px] mx-auto leading-relaxed">
            <strong className="font-medium">Aviso importante:</strong> o Galenus não
            atualiza, gerencia ou interfere nos estoques de medicamentos — apenas exibe,
            de forma mais simples, os dados públicos informados e mantidos pelos municípios
            e pelos sistemas de controle interno do Ministério da Saúde. As quantidades
            apresentadas podem estar desatualizadas ou divergir da realidade da unidade.
            Por isso, antes de se deslocar para retirar qualquer medicamento, procure
            sempre o contato da unidade de saúde e confirme a disponibilidade. A plataforma
            não indica, prescreve nem recomenda medicamentos de nenhuma forma. Os
            administradores do Galenus não se responsabilizam por quaisquer prejuízos,
            deslocamentos ou danos decorrentes do uso das informações aqui exibidas ou da
            imperícia do próprio usuário.
          </p>
          <p className="text-[13px] text-[#9CB8B0]">
            Dúvidas ou sugestões:{' '}
            <a href="mailto:patrickcprado@gmail.com"
              className="underline hover:text-[#1A4D3A] transition-colors">
              patrickcprado@gmail.com
            </a>
          </p>
        </footer>
      </main>
    </>
  )
}
