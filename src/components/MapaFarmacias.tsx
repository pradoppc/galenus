'use client'

import { useEffect, useRef } from 'react'
import type { MedicamentoResult } from '@/types'

interface MapaFarmaciasProps {
  items:     MedicamentoResult[]
  userLat?:  number
  userLng?:  number
  selected?: MedicamentoResult | null
}

export function MapaFarmacias({ items, userLat, userLng, selected }: MapaFarmaciasProps) {
  const mapRef      = useRef<HTMLDivElement>(null)
  const leafletRef  = useRef<ReturnType<typeof import('leaflet')['map']> | null>(null)

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return

    import('leaflet').then((L) => {
      // Fix marker icon paths for Next.js builds
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const centerLat = userLat ?? (items[0]?.farmacia_lat ?? -15.78)
      const centerLng = userLng ?? (items[0]?.farmacia_lng ?? -47.93)

      const map = L.map(mapRef.current!).setView([centerLat, centerLng], 12)
      leafletRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      if (userLat && userLng) {
        const userIcon = L.divIcon({
          className: '',
          html: '<div style="width:14px;height:14px;border-radius:50%;background:#1A4D3A;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>',
          iconSize:   [14, 14],
          iconAnchor: [7, 7],
        })
        L.marker([userLat, userLng], { icon: userIcon })
          .addTo(map)
          .bindPopup('Sua localização')
      }

      items.forEach((item) => {
        if (!item.farmacia_lat || !item.farmacia_lng) return

        const isLow    = item.quantidade > 0 && item.quantidade <= 5
        const isEmpty  = item.quantidade === 0
        const color    = isEmpty ? '#C04848' : isLow ? '#C8893A' : '#2B7A5A'

        const icon = L.divIcon({
          className: '',
          html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>`,
          iconSize:   [24, 24],
          iconAnchor: [12, 12],
        })

        L.marker([Number(item.farmacia_lat), Number(item.farmacia_lng)], { icon })
          .addTo(map)
          .bindPopup(`
            <strong>${item.farmacia_nome}</strong><br>
            ${item.farmacia_endereco ?? ''}<br>
            <em>${item.medicamento_produto}</em><br>
            ${item.quantidade} unidades
          `)
      })
    })

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove()
        leafletRef.current = null
      }
    }
  }, [])

  // Pan to selected marker
  useEffect(() => {
    if (!selected || !leafletRef.current || !selected.farmacia_lat || !selected.farmacia_lng) return
    leafletRef.current.setView([Number(selected.farmacia_lat), Number(selected.farmacia_lng)], 15)
  }, [selected])

  return (
    <div
      ref={mapRef}
      className="w-full rounded-[14px] overflow-hidden border border-[#D4E8DF]"
      style={{ height: 'clamp(300px, 40vw, 400px)', minHeight: '300px' }}
      aria-label="Mapa de farmácias"
      role="img"
    />
  )
}
