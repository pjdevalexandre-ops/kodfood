'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Percent,
  QrCode,
  CreditCard,
  Banknote,
  Award,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { Loja, ResumoFinanceiro } from '@/tipos';
import { obterResumoFinanceiro, buscarLojaPeloLink } from '@/acesso-aos-dados';
import { formatarPreco } from '@/utilitarios/formatadores';
import { NavegacaoPainel } from './navegacao-painel';

interface TelaFinanceiroPainelProps {
  lojaInicial: Loja;
}

export function TelaFinanceiroPainel({ lojaInicial }: TelaFinanceiroPainelProps) {
  const [loja, setLoja] = useState<Loja>(lojaInicial);
  const [periodo, setPeriodo] = useState<'hoje' | 'semana' | 'mes'>('hoje');
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [carregando, setCarregando] = useState(true);

  const searchParams = useSearchParams();
  const slug = searchParams.get('loja') || lojaInicial.link;

  const carregarResumo = async (lojaId: string, p: 'hoje' | 'semana' | 'mes') => {
    setCarregando(true);
    try {
      const dados = await obterResumoFinanceiro(lojaId, p);
      setResumo(dados);
    } catch (e) {
      console.error('Erro ao carregar resumo financeiro', e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (!slug) return;
    buscarLojaPeloLink(slug).then((l) => {
      if (l) {
        setLoja(l);
        carregarResumo(l.id, periodo);
      }
    });
  }, [slug, periodo]);

  const faturamento = resumo?.faturamento_total_centavos || 0;
  const pix = resumo?.total_por_pagamento.pix_centavos || 0;
  const cartao = resumo?.total_por_pagamento.cartao_centavos || 0;
  const dinheiro = resumo?.total_por_pagamento.dinheiro_centavos || 0;

  const percPix = faturamento > 0 ? Math.round((pix / faturamento) * 100) : 0;
  const percCartao = faturamento > 0 ? Math.round((cartao / faturamento) * 100) : 0;
  const percDinheiro = faturamento > 0 ? Math.round((dinheiro / faturamento) * 100) : 0;

  const totalPedidos = (resumo?.quantidade_pedidos_concluidos || 0) + (resumo?.quantidade_pedidos_cancelados || 0);
  const taxaCancelamento = totalPedidos > 0
    ? Math.round(((resumo?.quantidade_pedidos_cancelados || 0) / totalPedidos) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-stone-100/70 text-neutro-texto antialiased pb-24 md:pb-12 md:pl-64">
      {/* Navegação Responsiva */}
      <NavegacaoPainel loja={loja} />

      {/* CABEÇALHO */}
      <header className="sticky top-0 z-20 border-b border-neutro-borda bg-white shadow-xs py-3">
        <div className="w-full flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold"
              style={{ backgroundColor: loja.cor_principal }}
            >
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-titulo text-base font-bold text-neutro-texto">
                Financeiro & Vendas
              </h1>
              <p className="text-xs text-neutro-secundario">
                {loja.nome} · Relatório de faturamento e desempenho
              </p>
            </div>
          </div>

          {/* Seletor de Período */}
          <div className="flex items-center rounded-xl border border-stone-200 bg-stone-50 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPeriodo('hoje')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                periodo === 'hoje'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setPeriodo('semana')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                periodo === 'semana'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              7 Dias
            </button>
            <button
              type="button"
              onClick={() => setPeriodo('mes')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                periodo === 'mes'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              30 Dias
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="w-full p-4 sm:px-8 space-y-6">
        {carregando && !resumo ? (
          <div className="py-20 text-center text-xs text-stone-400">
            Calculando dados financeiros...
          </div>
        ) : (
          <>
            {/* 4 CARDS DE INDICADORES PRINCIPAIS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Faturamento Total */}
              <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span className="font-medium">Faturamento</span>
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="font-titulo text-xl sm:text-2xl font-bold text-stone-900">
                  {formatarPreco(faturamento)}
                </div>
                <p className="text-[11px] text-stone-400">Total apurado no período</p>
              </div>

              {/* Ticket Médio */}
              <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span className="font-medium">Ticket Médio</span>
                  <ShoppingBag className="h-4 w-4 text-sky-600" />
                </div>
                <div className="font-titulo text-xl sm:text-2xl font-bold text-stone-900">
                  {formatarPreco(resumo?.ticket_medio_centavos || 0)}
                </div>
                <p className="text-[11px] text-stone-400">Gasto médio por pedido</p>
              </div>

              {/* Pedidos Concluídos */}
              <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span className="font-medium">Pedidos Atendidos</span>
                  <TrendingUp className="h-4 w-4 text-violet-600" />
                </div>
                <div className="font-titulo text-xl sm:text-2xl font-bold text-stone-900">
                  {resumo?.quantidade_pedidos_concluidos || 0}
                </div>
                <p className="text-[11px] text-stone-400">Entregues com sucesso</p>
              </div>

              {/* Taxa de Cancelamento */}
              <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span className="font-medium">Cancelamentos</span>
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                </div>
                <div className="font-titulo text-xl sm:text-2xl font-bold text-stone-900">
                  {taxaCancelamento}%
                </div>
                <p className="text-[11px] text-stone-400">
                  {resumo?.quantidade_pedidos_cancelados || 0} cancelado(s)
                </p>
              </div>
            </div>

            {/* SEÇÃO DUPLA: FORMAS DE PAGAMENTO E PRODUTOS MAIS VENDIDOS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 1. Divisão por Forma de Pagamento */}
              <section className="lg:col-span-1 rounded-2xl border border-neutro-borda bg-white p-5 shadow-xs space-y-4">
                <h2 className="font-titulo text-sm font-bold text-neutro-texto border-b border-stone-100 pb-2">
                  Formas de Pagamento
                </h2>

                <div className="space-y-4 text-xs">
                  {/* Pix */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <QrCode className="h-4 w-4 text-sky-600" />
                        <span className="font-semibold text-stone-800">Pix</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-stone-900">{formatarPreco(pix)}</span>
                        <span className="text-[10px] text-stone-400 ml-1">({percPix}%)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full transition-all duration-500"
                        style={{ width: `${percPix}%` }}
                      />
                    </div>
                  </div>

                  {/* Cartão */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-violet-600" />
                        <span className="font-semibold text-stone-800">Cartão</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-stone-900">{formatarPreco(cartao)}</span>
                        <span className="text-[10px] text-stone-400 ml-1">({percCartao}%)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all duration-500"
                        style={{ width: `${percCartao}%` }}
                      />
                    </div>
                  </div>

                  {/* Dinheiro */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-emerald-600" />
                        <span className="font-semibold text-stone-800">Dinheiro</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-stone-900">{formatarPreco(dinheiro)}</span>
                        <span className="text-[10px] text-stone-400 ml-1">({percDinheiro}%)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${percDinheiro}%` }}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. Top Produtos Mais Vendidos */}
              <section className="lg:col-span-2 rounded-2xl border border-neutro-borda bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    <h2 className="font-titulo text-sm font-bold text-neutro-texto">
                      Lanches e Bebidas Mais Vendidos
                    </h2>
                  </div>
                  <span className="text-[11px] text-stone-400">Por unidades pedidas</span>
                </div>

                {(!resumo?.produtos_mais_vendidos || resumo.produtos_mais_vendidos.length === 0) ? (
                  <div className="py-12 text-center text-xs text-stone-400">
                    Nenhuma venda registrada no período selecionado.
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100 text-xs">
                    {resumo.produtos_mais_vendidos.map((prod, index) => {
                      const totalProd = prod.total_centavos;
                      const percentual = faturamento > 0 ? Math.round((totalProd / faturamento) * 100) : 0;

                      return (
                        <div key={prod.produto_id} className="py-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 font-bold text-[11px] text-stone-600 shrink-0">
                              {index + 1}º
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-stone-900 truncate">
                                {prod.nome}
                              </p>
                              <span className="text-[11px] text-stone-400">
                                {prod.quantidade} {prod.quantidade === 1 ? 'unidade vendida' : 'unidades vendidas'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-bold text-stone-900 block">
                              {formatarPreco(totalProd)}
                            </span>
                            <span className="text-[10px] text-stone-400">
                              {percentual}% das vendas
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
