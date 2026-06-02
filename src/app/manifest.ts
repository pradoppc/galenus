import type { MetadataRoute } from 'next'
import { BRAND, COLORS } from '@/lib/design-tokens'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             BRAND.fullName,
    short_name:       BRAND.name,
    description:      BRAND.tagline,
    start_url:        '/',
    display:          'standalone',
    background_color: COLORS.background,
    theme_color:      COLORS.primary,
    orientation:      'portrait',
    lang:             'pt-BR',
    categories:       ['health', 'medical', 'government'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
    shortcuts: [{
      name:        'Buscar medicamento',
      url:         '/buscar',
      description: 'Encontre medicamentos gratuitos perto de você',
      icons: [{ src: '/icon-192.png', sizes: '192x192' }],
    }],
  }
}
