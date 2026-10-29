'use client';

import Image from 'next/image';
import { Produto } from '@/tipos';
import { formatarPreco } from '@/utilitarios/formatadores';

interface LinhaDoProdutoProps {
  produto: Produto;
  lojaAberta: boolean;
  corLoja: string;
  aoClicar?: (produto: Produto) => void;
}

export function LinhaDoProduto({
  produto,
  lojaAberta,
  corLoja,
  aoClicar,
}: LinhaDoProdutoProps) {
  const lidarComClique = () => {
    if (!lojaAberta) return;
    if (aoClicar) {
      aoClicar(produto);
    }
  };

  return (
    <article
      onClick={lidarComClique}
      className={`group flex items-start justify-between gap-3 border-b border-stone-200/60 bg-white p-4 transition-colors ${
        lojaAberta
          ? 'cursor-pointer hover:bg-stone-50 active:bg-stone-100'
          : 'cursor-not-allowed opacity-80'
      }`}
    >
      {/* Dados do produto à esquerda */}
      <div className="flex-1 min-w-0 pr-1">
        <h3 className="font-semibold text-sm leading-snug text-neutro-texto group-hover:text-black">
          {produto.nome}
        </h3>

        {produto.descricao && (
          <p className="mt-1 line-clamp-2 text-xs text-neutro-secundario leading-relaxed">
            {produto.descricao}
          </p>
        )}

        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-neutro-texto">
            {formatarPreco(produto.preco_centavos)}
          </span>

          {!lojaAberta && (
            <span className="text-[11px] font-medium text-stone-500">
              Indisponível no momento
            </span>
          )}
        </div>
      </div>

      {/* Foto pequena à direita (se houver foto) */}
      {produto.foto_url && (
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-neutro-borda bg-stone-100">
          <Image
            src={produto.foto_url}
            alt={produto.nome}
            fill
            sizes="80px"
            className="object-cover"
          />
        </div>
      )}
    </article>
  );
}
