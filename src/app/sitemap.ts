import type { MetadataRoute } from 'next'
import { BRAND } from '@/lib/design-tokens'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BRAND.url,                changeFrequency: 'daily',   priority: 1.0, lastModified: new Date() },
    { url: `${BRAND.url}/buscar`,    changeFrequency: 'daily',   priority: 0.9, lastModified: new Date() },
    { url: `${BRAND.url}/login`,     changeFrequency: 'monthly', priority: 0.3, lastModified: new Date() },
    { url: `${BRAND.url}/cadastro`,  changeFrequency: 'monthly', priority: 0.3, lastModified: new Date() },
  ]
}
