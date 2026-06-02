import type { Metadata } from 'next'
import { Cormorant_Garamond, DM_Sans } from 'next/font/google'
import { BRAND, COLORS } from '@/lib/design-tokens'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets:  ['latin'],
  weight:   ['400', '500', '600'],
  style:    ['normal', 'italic'],
  variable: '--font-display',
  display:  'swap',
})

const dmSans = DM_Sans({
  subsets:  ['latin'],
  weight:   ['300', '400', '500'],
  variable: '--font-body',
  display:  'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: {
    default:  `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  keywords:    [...BRAND.keywords],
  authors:     [{ name: BRAND.author, url: BRAND.url }],
  creator:     BRAND.name,
  publisher:   BRAND.name,
  robots: {
    index:     true,
    follow:    true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type:        'website',
    locale:      BRAND.locale,
    url:         BRAND.url,
    siteName:    BRAND.name,
    title:       `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    images: [{
      url:    '/og-image.png',
      width:  1200,
      height: 630,
      alt:    `${BRAND.name} — ${BRAND.tagline}`,
    }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    images:      ['/og-image.png'],
  },
  alternates: {
    canonical: BRAND.url,
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  other: {
    'theme-color': COLORS.primary,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  )
}
