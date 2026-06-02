import type { MetadataRoute } from 'next'
import { BRAND } from '@/lib/design-tokens'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow:     '/',
      disallow:  ['/admin', '/api/admin', '/api/auth'],
    }],
    sitemap: `${BRAND.url}/sitemap.xml`,
    host:    BRAND.url,
  }
}
