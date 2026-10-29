'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { Loja } from '@/tipos';
import { buscarLojaPeloLink } from '@/acesso-aos-dados';
import { SacolaProvedor, useSacola } from '@/contextos/sacola-contexto';
import { ItemDaSacola } from './item-da-sacola';
import { SacolaVazia } from './sacola-vazia';
import { formatarPreco } from '@/utilitarios/formatadores';

interface PaginaDaSacolaConteudoProps {
  loja: Loja;
}

function ConteudoDaSacola({ loja }: PaginaDaSacolaConteudoProps) {
  const {
    itens,
    removerItem,
    alterarQuantidade,
    subtotalCentavos,
    quantidadeTotalItens,
    carregado,
  } = useSacola();

  if (!carregado) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-neutro-fundo p-4">
        <div className="h-10 w-32 animate-pulse rounded bg-stone-200 mb-4" />
        <div className="h-40 w-full animate-pulse rounded-xl bg-white" />
      </div>
    );
  }

  if (itens.length === 0) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-neutro-fundo">
        <header className="flex h-14 items-center border-b border-neutro-borda bg-white px-4">
          <Link
            href={`/${loja.link}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-neutro-texto hover:text-stone-600"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Cardápio</span>
          </Link>
          <h1 className="flex-1 text-center font-titulo text-sm font-bold text-neutro-texto pr-14">
            Sacola
          </h1>
        </header>

        <SacolaVazia lojaLink={loja.link} corLoja={loja.cor_principal} />
      </div>
    );
  }

  const atingePedidoMinimo = subtotalCentavos >= loja.pedido_minimo_centavos;
  const diferencaPedidoMinimo = loja.pedido_minimo_centavos - subtotalCentavos;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-neutro-fundo text-neutro-texto antialiased">
      {/* Cabeçalho */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-neutro-borda bg-white px-4">
        <Link
          href={`/${loja.link}`}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutro-texto hover:text-stone-600"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Cardápio</span>
        </Link>
        <h1 className="font-titulo text-sm font-bold text-neutro-texto">
          Sua Sacola ({quantidadeTotalItens})
        </h1>
        <div className="w-16" />
      </header>

      {/* Lista de itens */}
      <main className="flex-1 p-4 space-y-3 pb-36">
        <div className="space-y-3">
          {itens.map((item) => (
            <ItemDaSacola
              key={item.idItemSacola}
              item={item}
              aoAlterarQuantidade={(delta) =>
                alterarQuantidade(item.idItemSacola, item.quantidade + delta)
              }
              aoRemover={() => removerItem(item.idItemSacola)}
            />
          ))}
        </div>

        {/* Link para adicionar mais itens */}
        <Link
          href={`/${loja.link}`}
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-neutro-borda py-3 text-xs font-semibold text-stone-600 hover:border-stone-400 hover:bg-white transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Adicionar mais itens</span>
        </Link>

        {/* Alerta de pedido mínimo */}
        {!atingePedidoMinimo && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 leading-relaxed">
            <span className="font-semibold">Pedido mínimo não atingido:</span> O valor mínimo da loja é{' '}
            <strong>{formatarPreco(loja.pedido_minimo_centavos)}</strong>. Adicione mais{' '}
            <strong>{formatarPreco(diferencaPedidoMinimo)}</strong> à sua sacola para prosseguir.
          </div>
        )}
      </main>

      {/* Barra fixa de fechamento */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-neutro-borda bg-white p-4 shadow-lg">
        <div className="mx-auto max-w-md space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutro-secundario">Subtotal</span>
            <span className="font-titulo font-bold text-neutro-texto">
              {formatarPreco(subtotalCentavos)}
            </span>
          </div>

          <Link
            href={`/${loja.link}/finalizar`}
            className={`flex h-12 w-full items-center justify-center rounded-xl text-xs font-semibold text-white shadow-sm transition-all ${
              atingePedidoMinimo
                ? 'opacity-100 active:scale-[0.99]'
                : 'pointer-events-none opacity-40'
            }`}
            style={{ backgroundColor: loja.cor_principal }}
          >
            {atingePedidoMinimo
              ? 'Continuar para entrega e pagamento'
              : `Pedido mínimo não atingido`}
          </Link>
        </div>
      </footer>
    </div>
  );
}

export function PaginaDaSacolaCliente({
  linkSlug,
  loja: lojaInicial,
}: {
  linkSlug?: string;
  loja?: Loja | null;
}) {
  const [loja, setLoja] = useState<Loja | null>(lojaInicial || null);
  const slug = linkSlug || lojaInicial?.link || '';

  useEffect(() => {
    if (!slug) return;
    buscarLojaPeloLink(slug).then((lojaAtual) => {
      if (lojaAtual) {
        setLoja(lojaAtual);
      }
    });
  }, [slug]);

  if (!loja) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-neutro-fundo p-4 animate-pulse">
        <div className="h-10 w-32 rounded bg-stone-200 mb-4" />
        <div className="h-40 w-full rounded-xl bg-white" />
      </div>
    );
  }

  return (
    <SacolaProvedor lojaLink={loja.link}>
      <ConteudoDaSacola loja={loja} />
    </SacolaProvedor>
  );
}
