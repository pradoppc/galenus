'use client'

import { Badge, stockBadgeVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatRelativeDate, formatDistance } from '@/lib/utils'
import type { MedicamentoResult } from '@/types'

interface CardFarmaciaProps {
  item:       MedicamentoResult
  onVerMapa?: (item: MedicamentoResult) => void
}


export function CardFarmacia({ item, onVerMapa }: CardFarmaciaProps) {
  const variant   = stockBadgeVariant(item.quantidade)
  const fantasia  = (item as unknown as { farmacia_fantasia?: string }).farmacia_fantasia
  const mapsUrl   = item.farmacia_lat && item.farmacia_lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${item.farmacia_lat},${item.farmacia_lng}`
    : null

  function handleShare() {
    const unidade  = fantasia || item.farmacia_nome
    const endereco = [item.farmacia_endereco, item.farmacia_municipio, item.farmacia_uf].filter(Boolean).join(' — ')

    const msg = [
      `🏥 *${unidade}*`,
      `💊 *Medicamento:* ${item.medicamento_produto}`,
      item.medicamento_apresentacao ? `📋 *Apresentação:* ${item.medicamento_apresentacao}` : null,
      `📦 *Quantidade em estoque:* ${item.quantidade} unidades`,
      `📍 *Endereço:* ${endereco}`,
      ``,
      `⚠️ *Atenção:* o Galenus apenas exibe os dados de estoque informados pelos municípios e pelo Ministério da Saúde — não os atualiza. Antes de se deslocar, confirme a disponibilidade com a unidade de saúde. A plataforma não indica nem recomenda medicamentos.`,
      ``,
      `_Fonte: galenusmed.com.br — Porque saúde começa com acesso_`,
    ].filter(Boolean).join('\n')

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <article
      className="rounded-[14px] border border-[#D4E8DF] bg-white p-4 shadow-[0_1px_4px_rgba(26,77,58,.08)] flex flex-col gap-3"
      aria-label={`Farmácia ${fantasia || item.farmacia_nome}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h2 className="text-[20px] font-medium text-[#1A4D3A] leading-tight truncate">
            {fantasia || item.farmacia_nome}
          </h2>
          {fantasia && (
            <p className="text-[14px] text-[#9CB8B0] truncate">{item.farmacia_nome}</p>
          )}
        </div>
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
        {item.distancia_km != null && (
          <p className="font-medium text-[#2B7A5A]">{formatDistance(item.distancia_km)}</p>
        )}
        <p className="text-[14px] text-[#9CB8B0]">
          Atualizado {formatRelativeDate(item.atualizado_em)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {onVerMapa && (
          <Button variant="outline" size="sm" onClick={() => onVerMapa(item)} aria-label="Ver no mapa">
            Ver no mapa
          </Button>
        )}
        {mapsUrl && (
          <Button variant="secondary" size="sm"
            onClick={() => window.open(mapsUrl, '_blank', 'noopener,noreferrer')}
            aria-label="Como chegar">
            Como chegar
          </Button>
        )}
        <Button
          variant="ghost" size="sm"
          onClick={handleShare}
          aria-label="Compartilhar no WhatsApp"
          className="text-[#25D366] hover:bg-[#25D366]/10 border border-[#25D366]/30"
        >
          <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Compartilhar
        </Button>
      </div>
    </article>
  )
}
