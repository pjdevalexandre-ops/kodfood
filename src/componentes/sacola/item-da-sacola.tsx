'use client';

import { Plus, Minus, Trash2 } from 'lucide-react';
import { ItemSacola } from '@/tipos/sacola';
import { formatarPreco } from '@/utilitarios/formatadores';

interface ItemDaSacolaProps {
  item: ItemSacola;
  aoAlterarQuantidade: (novaQuantidade: number) => void;
  aoRemover: () => void;
}

export function ItemDaSacola({
  item,
  aoAlterarQuantidade,
  aoRemover,
}: ItemDaSacolaProps) {
  return (
    <article className="border-b border-neutro-borda bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-neutro-texto leading-snug">
            {item.produto.nome}
          </h3>

          {/* Adicionais selecionados */}
          {item.adicionais.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {item.adicionais.map((ad, idx) => (
                <li key={idx} className="text-xs text-neutro-secundario">
                  + {ad.nome}
                  {ad.preco_centavos > 0 && (
                    <span className="text-stone-400">
                      {' '}
                      ({formatarPreco(ad.preco_centavos)})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Observação digitada pelo cliente */}
          {item.observacao && (
            <p className="mt-1.5 rounded bg-stone-50 p-1.5 text-xs italic text-stone-600 border border-stone-100">
              &ldquo;{item.observacao}&rdquo;
            </p>
          )}
        </div>

        {/* Preço total desta linha */}
        <span className="font-semibold text-sm text-neutro-texto shrink-0">
          {formatarPreco(item.precoTotalCentavos)}
        </span>
      </div>

      {/* Controles de quantidade e remoção */}
      <div className="mt-3 flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={aoRemover}
          className="flex items-center gap-1 text-xs text-stone-500 hover:text-red-700 transition-colors py-1"
          aria-label={`Remover ${item.produto.nome} da sacola`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Remover</span>
        </button>

        <div className="flex items-center rounded-lg border border-neutro-borda bg-stone-50">
          <button
            type="button"
            onClick={() => aoAlterarQuantidade(item.quantidade - 1)}
            aria-label="Diminuir uma unidade"
            className="flex h-9 w-9 items-center justify-center text-stone-700 hover:bg-stone-100 rounded-l-lg transition-colors"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-8 text-center text-xs font-bold text-neutro-texto">
            {item.quantidade}
          </span>
          <button
            type="button"
            onClick={() => aoAlterarQuantidade(item.quantidade + 1)}
            aria-label="Aumentar uma unidade"
            className="flex h-9 w-9 items-center justify-center text-stone-700 hover:bg-stone-100 rounded-r-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
