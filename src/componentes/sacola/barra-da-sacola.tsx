'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useSacola } from '@/contextos/sacola-contexto';
import { formatarPreco } from '@/utilitarios/formatadores';

interface BarraDaSacolaProps {
  lojaLink: string;
  corLoja: string;
}

export function BarraDaSacola({ lojaLink, corLoja }: BarraDaSacolaProps) {
  const { quantidadeTotalItens, subtotalCentavos, carregado } = useSacola();

  if (!carregado || quantidadeTotalItens === 0) {
    return null;
  }

  const textoItens = quantidadeTotalItens === 1 ? '1 item' : `${quantidadeTotalItens} itens`;

  return (
    <aside
      aria-label="Resumo da sacola"
      className="fixed bottom-0 left-0 right-0 z-30 p-3 sm:p-4 pointer-events-none"
    >
      <div className="mx-auto max-w-md pointer-events-auto">
        <Link
          href={`/${lojaLink}/sacola`}
          className="flex h-12 w-full items-center justify-between rounded-xl px-4 text-xs font-semibold text-white shadow-lg transition-transform active:scale-[0.99]"
          style={{ backgroundColor: corLoja }}
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            <span>Ver sacola</span>
            <span className="text-white/60">·</span>
            <span>{textoItens}</span>
          </div>

          <span className="font-bold">{formatarPreco(subtotalCentavos)}</span>
        </Link>
      </div>
    </aside>
  );
}
