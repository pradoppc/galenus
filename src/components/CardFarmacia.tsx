'use client'

import { Badge, stockBadgeVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatRelativeDate, formatDistance } from '@/lib/utils'
import type { MedicamentoResult } from '@/types'

interface CardFarmaciaProps {
  item:        MedicamentoResult
  onVerMapa?:  (item: MedicamentoResult) => void
}

export function CardFarmacia({ item, onVerMapa }: CardFarmaciaProps) {
  const variant = stockBadgeVariant(item.quantidade)

  const mapsUrl = item.farmacia_lat && item.farmacia_lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${item.farmacia_lat},${item.farmacia_lng}`
    : null

  return (
    <article
      className="rounded-[14px] border border-[#D4E8DF] bg-white p-4 shadow-[0_1px_4px_rgba(26,77,58,.08)] flex flex-col gap-3"
      aria-label={`Farmácia ${item.farmacia_nome}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-[20px] font-medium text-[#1A4D3A] leading-tight">{item.farmacia_nome}</h2>
        <Badge variant={variant} quantity={item.quantidade} />
      </div>

      <div>
        <p className="text-[18px] font-medium text-[#2D4A3E]">{item.medicamento_produto}</p>
        {item.medicamento_apresentacao && (
          <p className="text-[16px] text-[#5B8C7A]">{item.medicamento_apresentacao}</p>
        )}
        {item.programa && (
          <span className="inline-block mt-1 text-[13px] bg-[#EAF3EE] text-[#2B7A5A] px-2 py-0.5 rounded-full">
            {item.programa}
          </span>
        )}
      </div>

      <div className="text-[16px] text-[#5B8C7A] space-y-0.5">
        <p>{item.farmacia_endereco}</p>
        <p>{item.farmacia_municipio} — {item.farmacia_uf}</p>
        {item.distancia_km !== null && (
          <p className="font-medium text-[#2B7A5A]">{formatDistance(item.distancia_km)}</p>
        )}
        <p className="text-[14px] text-[#9CB8B0]">
          Atualizado {formatRelativeDate(item.atualizado_em)}
        </p>
      </div>

      <div className="flex gap-2 pt-1">
        {onVerMapa && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onVerMapa(item)}
            aria-label={`Ver ${item.farmacia_nome} no mapa`}
          >
            Ver no mapa
          </Button>
        )}
        {mapsUrl && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.open(mapsUrl, '_blank', 'noopener,noreferrer')}
            aria-label={`Como chegar em ${item.farmacia_nome}`}
          >
            Como chegar
          </Button>
        )}
      </div>
    </article>
  )
}
