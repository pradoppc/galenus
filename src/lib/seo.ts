import type { Metadata } from 'next'
import { BRAND } from '@/lib/design-tokens'

interface PageSeoParams {
  title:       string
  description: string
  path?:       string
  noIndex?:    boolean
}

export function buildMetadata({
  title,
  description,
  path    = '',
  noIndex = false,
}: PageSeoParams): Metadata {
  const url = `${BRAND.url}${path}`

  return {
    title,
    description,
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: BRAND.name,
      locale:   BRAND.locale,
      type:     'website',
      images: [{ url: `${BRAND.url}/og-image.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images: [`${BRAND.url}/og-image.png`],
    },
  }
}
