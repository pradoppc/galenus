'use client'

import { CardFarmacia } from '@/components/CardFarmacia'
import { Button } from '@/components/ui/Button'
import type { MedicamentoResult } from '@/types'

interface ListaMedicamentosProps {
  items:       MedicamentoResult[]
  loading:     boolean
  hasMore:     boolean
  onLoadMore:  () => void
  onVerMapa?:  (item: MedicamentoResult) => void
}

function SkeletonCard() {
  return (
    <div className="rounded-[14px] border border-[#D4E8DF] bg-white p-4 animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="h-5 bg-[#EAF3EE] rounded w-2/3" />
        <div className="h-5 bg-[#EAF3EE] rounded w-24" />
      </div>
      <div className="h-4 bg-[#EAF3EE] rounded w-1/2" />
      <div className="space-y-1.5">
        <div className="h-3 bg-[#EAF3EE] rounded w-full" />
        <div className="h-3 bg-[#EAF3EE] rounded w-3/4" />
      </div>
      <div className="flex gap-2">
        <div className="h-10 bg-[#EAF3EE] rounded w-28" />
        <div className="h-10 bg-[#EAF3EE] rounded w-28" />
      </div>
    </div>
  )
}

export function ListaMedicamentos({
  items,
  loading,
  hasMore,
  onLoadMore,
  onVerMapa,
}: ListaMedicamentosProps) {
  if (loading && items.length === 0) {
    return (
      <div className="space-y-3" aria-label="Carregando resultados" aria-busy="true">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (!loading && items.length === 0) {
    return (
      <div className="text-center py-12 text-[#5B8C7A]">
        <p className="text-[20px]">Nenhuma farmácia encontrada</p>
        <p className="mt-2 text-[16px]">
          Tente ampliar o raio de busca ou verificar o nome do medicamento.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <CardFarmacia
          key={`${item.farmacia_id}-${item.medicamento_produto}`}
          item={item}
          onVerMapa={onVerMapa}
        />
      ))}

      {loading && <SkeletonCard />}

      {hasMore && !loading && (
        <Button
          variant="outline"
          size="md"
          className="w-full mt-4"
          onClick={onLoadMore}
          aria-label="Carregar mais resultados"
        >
          Carregar mais
        </Button>
      )}
    </div>
  )
}
