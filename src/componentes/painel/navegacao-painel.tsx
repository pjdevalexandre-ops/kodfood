'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  ClipboardList,
  UtensilsCrossed,
  Bike,
  Store,
  ExternalLink,
  LogOut,
  Banknote,
  TrendingUp,
  Users,
  Boxes,
} from 'lucide-react';
import { Loja } from '@/tipos';

interface NavegacaoPainelProps {
  loja: Loja;
}

export function NavegacaoPainel({ loja }: NavegacaoPainelProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lojaParam = searchParams.get('loja') || loja.link;

  const itensNavegacao = [
    {
      titulo: 'Pedidos',
      href: `/painel/pedidos?loja=${lojaParam}`,
      icone: ClipboardList,
      ativo: pathname.includes('/painel/pedidos'),
    },
    {
      titulo: 'Mesas',
      href: `/painel/mesas?loja=${lojaParam}`,
      icone: Users,
      ativo: pathname.includes('/painel/mesas'),
    },
    {
      titulo: 'Cardápio',
      href: `/painel/cardapio?loja=${lojaParam}`,
      icone: UtensilsCrossed,
      ativo: pathname.includes('/painel/cardapio'),
    },
    {
      titulo: 'Estoque',
      href: `/painel/estoque?loja=${lojaParam}`,
      icone: Boxes,
      ativo: pathname.includes('/painel/estoque'),
    },
    {
      titulo: 'Caixa',
      href: `/painel/caixa?loja=${lojaParam}`,
      icone: Banknote,
      ativo: pathname.includes('/painel/caixa'),
    },
    {
      titulo: 'Financeiro',
      href: `/painel/financeiro?loja=${lojaParam}`,
      icone: TrendingUp,
      ativo: pathname.includes('/painel/financeiro'),
    },
    {
      titulo: 'Entrega',
      href: `/painel/entrega?loja=${lojaParam}`,
      icone: Bike,
      ativo: pathname.includes('/painel/entrega'),
    },
    {
      titulo: 'Loja',
      href: `/painel/loja?loja=${lojaParam}`,
      icone: Store,
      ativo: pathname.includes('/painel/loja'),
    },
  ];

  return (
    <>
      {/* 1. BARRA INFERIOR NO CELULAR */}
      <nav
        aria-label="Navegação do painel"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200/90 bg-white/95 backdrop-blur-md md:hidden safe-bottom"
      >
        <div className="flex h-16 items-center overflow-x-auto no-scrollbar px-1.5 gap-1">
          {itensNavegacao.map((item) => {
            const Icone = item.icone;
            const estaAtivo = item.ativo;

            return (
              <Link
                key={item.titulo}
                href={item.href}
                className={`flex flex-col items-center justify-center min-w-[58px] flex-1 h-full py-1 text-[10px] font-bold transition-all ${
                  estaAtivo
                    ? 'text-stone-900 font-extrabold'
                    : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                    estaAtivo
                      ? 'text-white shadow-xs scale-105'
                      : 'text-stone-500'
                  }`}
                  style={estaAtivo ? { backgroundColor: loja.cor_principal } : undefined}
                >
                  <Icone className="h-4 w-4" />
                </div>
                <span className="mt-1 tracking-tight">{item.titulo}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 2. MENU LATERAL NO COMPUTADOR / TABLET */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 border-r border-stone-200/80 bg-white shadow-2xs">
        {/* Topo do Sidebar */}
        <div className="flex items-center gap-3 border-b border-stone-100 p-5 bg-stone-50/40">
          <div
            className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl font-titulo text-lg font-bold text-white shadow-xs shrink-0"
            style={{ backgroundColor: loja.cor_principal }}
          >
            {loja.logo_url ? (
              <Image
                src={loja.logo_url}
                alt={loja.nome}
                fill
                className="object-cover"
              />
            ) : (
              loja.nome.charAt(0)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-titulo text-sm font-bold text-stone-900 truncate">
              {loja.nome}
            </h2>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-stone-500 mt-0.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  loja.aberta ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-stone-300'
                }`}
              />
              {loja.aberta ? 'Aberta agora' : 'Fechada'}
            </span>
          </div>
        </div>

        {/* Links de Navegação */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-1">
          {itensNavegacao.map((item) => {
            const Icone = item.icone;
            const estaAtivo = item.ativo;

            return (
              <Link
                key={item.titulo}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                  estaAtivo
                    ? 'text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100/80 hover:text-stone-900'
                }`}
                style={estaAtivo ? { backgroundColor: loja.cor_principal } : undefined}
              >
                <Icone className={`h-4 w-4 ${estaAtivo ? 'text-white' : 'text-stone-400'}`} />
                <span>{item.titulo}</span>
              </Link>
            );
          })}
        </div>

        {/* Rodapé do Sidebar */}
        <div className="border-t border-stone-100 p-4 space-y-2 bg-stone-50/30">
          <Link
            href={`/${loja.link}`}
            target="_blank"
            className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-2xs"
          >
            <span>Ver cardápio cliente</span>
            <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
          </Link>

          <Link
            href="/painel/entrar"
            className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sair ou trocar de loja</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
