'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  Volume2,
  VolumeX,
  Store,
  RefreshCw,
  LogOut,
  Power,
  Inbox,
  Flame,
  Truck,
  CheckCircle,
  UtensilsCrossed,
  Sparkles,
} from 'lucide-react';
import { Loja, Pedido, SituacaoPedido } from '@/tipos';
import {
  listarPedidosDoPainel,
  mudarSituacaoDoPedido,
  alternarStatusAbertaLoja,
  buscarLojaPeloLink,
} from '@/acesso-aos-dados';
import { tocarSomNovoPedido } from '@/utilitarios/som-notificacao';
import { CartaoDoPedido } from './cartao-do-pedido';
import { ComandaImpressao } from './comanda-impressao';
import { NavegacaoPainel } from './navegacao-painel';

interface TelaPedidosPainelProps {
  lojaInicial: Loja;
}

type AbaPainel = 'novos' | 'preparo' | 'prontos' | 'finalizados';

export function TelaPedidosPainel({ lojaInicial }: TelaPedidosPainelProps) {
  const [loja, setLoja] = useState<Loja>(lojaInicial);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [somAtivo, setSomAtivo] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<AbaPainel>('novos');
  const [pedidoParaImprimir, setPedidoParaImprimir] = useState<Pedido | null>(null);

  const idsConhecidosRef = useRef<Set<string>>(new Set());
  const primeiraCargaRef = useRef(true);

  const searchParams = useSearchParams();
  const slug = searchParams.get('loja') || lojaInicial.link;

  useEffect(() => {
    if (!slug) return;
    buscarLojaPeloLink(slug).then((l) => {
      if (l) setLoja(l);
    });
  }, [slug]);

  // Carrega preferência de som do localStorage
  useEffect(() => {
    try {
      const somSalvo = localStorage.getItem('kodfood_som_ativo');
      if (somSalvo !== null) {
        setSomAtivo(somSalvo === 'true');
      }
    } catch {}
  }, []);

  const alternarSom = () => {
    const novoValor = !somAtivo;
    setSomAtivo(novoValor);
    try {
      localStorage.setItem('kodfood_som_ativo', String(novoValor));
    } catch {}
  };

  // Carrega e atualiza os pedidos periodicamente (polling a cada 4 segundos)
  useEffect(() => {
    let cancelado = false;

    async function carregarPedidos() {
      try {
        const lista = await listarPedidosDoPainel(loja.id);
        if (cancelado) return;

        if (!primeiraCargaRef.current && somAtivo) {
          const temNovoPedido = lista.some(
            (p) =>
              p.situacao === 'recebido' && !idsConhecidosRef.current.has(p.id)
          );
          if (temNovoPedido) {
            tocarSomNovoPedido();
          }
        }

        idsConhecidosRef.current = new Set(lista.map((p) => p.id));
        primeiraCargaRef.current = false;
        setPedidos(lista);
      } catch (e) {
        console.error('Erro ao buscar pedidos', e);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    carregarPedidos();
    const intervalo = setInterval(carregarPedidos, 4000);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [loja.id, somAtivo]);

  // Avançar situação do pedido
  const lidarComAvanco = async (pedidoId: string, proximaSituacao: SituacaoPedido) => {
    try {
      const atualizado = await mudarSituacaoDoPedido(pedidoId, proximaSituacao);
      setPedidos((antigos) =>
        antigos.map((p) => (p.id === pedidoId ? atualizado : p))
      );
    } catch (e) {
      alert('Não foi possível alterar a situação do pedido.');
    }
  };

  // Cancelar pedido
  const lidarComCancelamento = async (pedidoId: string) => {
    try {
      const atualizado = await mudarSituacaoDoPedido(pedidoId, 'cancelado');
      setPedidos((antigos) =>
        antigos.map((p) => (p.id === pedidoId ? atualizado : p))
      );
    } catch (e) {
      alert('Não foi possível cancelar o pedido.');
    }
  };

  // Alternar Loja Aberta/Fechada
  const lidarComAlternarAberta = async () => {
    try {
      const atualizada = await alternarStatusAbertaLoja(loja.id, !loja.aberta);
      setLoja(atualizada);
    } catch {
      alert('Não foi possível alterar o status da loja.');
    }
  };

  // Imprimir pedido
  const lidarComImprimir = (pedido: Pedido) => {
    setPedidoParaImprimir(pedido);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Agrupamento dos pedidos por situação
  const pedidosNovos = useMemo(
    () => pedidos.filter((p) => p.situacao === 'recebido'),
    [pedidos]
  );

  const pedidosEmPreparo = useMemo(
    () => pedidos.filter((p) => p.situacao === 'confirmado' || p.situacao === 'em_preparo'),
    [pedidos]
  );

  const pedidosProntosOuSaiu = useMemo(
    () =>
      pedidos.filter(
        (p) => p.situacao === 'pronto_para_retirada' || p.situacao === 'saiu_para_entrega'
      ),
    [pedidos]
  );

  const pedidosFinalizados = useMemo(
    () => pedidos.filter((p) => p.situacao === 'entregue' || p.situacao === 'cancelado'),
    [pedidos]
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-neutro-texto antialiased pb-20 md:pb-6 md:pl-64 print:bg-white print:pl-0 print:pb-0">
      {/* Navegação Responsiva do Painel */}
      <Suspense fallback={<div className="w-64" />}>
        <NavegacaoPainel loja={loja} />
      </Suspense>

      {/* Comanda térmica oculta na tela (só aparece na impressão) */}
      <ComandaImpressao pedido={pedidoParaImprimir} nomeLoja={loja.nome} />

      {/* BARRA SUPERIOR DO PAINEL */}
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/95 backdrop-blur-md shadow-2xs print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Identificação da Loja */}
          <div className="flex items-center gap-3">
            <div
              className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl font-titulo text-lg font-bold text-white shadow-xs shrink-0"
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

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-titulo text-base font-bold text-stone-900">
                  {loja.nome}
                </h1>
                <Link
                  href={`/${loja.link}`}
                  target="_blank"
                  className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded-md transition-colors"
                >
                  <span>Ver cardápio</span>
                  <span>↗</span>
                </Link>
              </div>
              <p className="text-xs text-stone-500">Painel de Pedidos em Tempo Real</p>
            </div>
          </div>

          {/* Controles: Cardápio, Aberta/Fechada, Som e Logout */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Atalho para Gestão do Cardápio */}
            <Link
              href={`/painel/cardapio?loja=${loja.link}`}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-2xs"
            >
              <UtensilsCrossed className="h-3.5 w-3.5 text-stone-600" />
              <span className="hidden sm:inline">Gerenciar Cardápio</span>
            </Link>

            {/* Interruptor Loja Aberta / Fechada */}
            <button
              type="button"
              onClick={lidarComAlternarAberta}
              className={`flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-all shadow-2xs ${
                loja.aberta
                  ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'border border-stone-300 bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <Power className={`h-3.5 w-3.5 ${loja.aberta ? 'text-emerald-700' : 'text-stone-400'}`} />
              <span className="hidden sm:inline">
                {loja.aberta ? 'Loja Aberta' : 'Loja Fechada'}
              </span>
              <span className="sm:hidden">{loja.aberta ? 'Aberta' : 'Fechada'}</span>
            </button>

            {/* Controle de Som */}
            <button
              type="button"
              onClick={alternarSom}
              title={somAtivo ? 'Desativar aviso sonoro' : 'Ativar aviso sonoro'}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors shadow-2xs ${
                somAtivo
                  ? 'border-stone-200 bg-white text-stone-800 hover:bg-stone-50'
                  : 'border-stone-200 bg-stone-100 text-stone-400'
              }`}
            >
              {somAtivo ? <Volume2 className="h-4 w-4 text-emerald-600" /> : <VolumeX className="h-4 w-4" />}
            </button>

            {/* Sair do Painel */}
            <Link
              href="/painel/entrar"
              title="Trocar de loja ou sair"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition-colors shadow-2xs"
            >
              <LogOut className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* NAVEGAÇÃO POR ABAS NO CELULAR */}
        <div className="flex border-t border-stone-100 px-2 md:hidden bg-stone-50/50">
          <button
            onClick={() => setAbaAtiva('novos')}
            className={`flex-1 py-2.5 text-center text-xs font-bold transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              abaAtiva === 'novos'
                ? 'border-amber-500 text-amber-900 bg-amber-50/60'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>Novos</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 text-[10px]">
              {pedidosNovos.length}
            </span>
          </button>

          <button
            onClick={() => setAbaAtiva('preparo')}
            className={`flex-1 py-2.5 text-center text-xs font-bold transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              abaAtiva === 'preparo'
                ? 'border-orange-500 text-orange-900 bg-orange-50/60'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>Preparo</span>
            <span className="px-1.5 py-0.2 rounded-full bg-orange-200 text-orange-900 text-[10px]">
              {pedidosEmPreparo.length}
            </span>
          </button>

          <button
            onClick={() => setAbaAtiva('prontos')}
            className={`flex-1 py-2.5 text-center text-xs font-bold transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              abaAtiva === 'prontos'
                ? 'border-blue-600 text-blue-900 bg-blue-50/60'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>Prontos</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-200 text-blue-900 text-[10px]">
              {pedidosProntosOuSaiu.length}
            </span>
          </button>

          <button
            onClick={() => setAbaAtiva('finalizados')}
            className={`flex-1 py-2.5 text-center text-xs font-bold transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              abaAtiva === 'finalizados'
                ? 'border-emerald-600 text-emerald-900 bg-emerald-50/60'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>Fim</span>
            <span className="px-1.5 py-0.2 rounded-full bg-stone-200 text-stone-800 text-[10px]">
              {pedidosFinalizados.length}
            </span>
          </button>
        </div>
      </header>

      {/* ÁREA DE PEDIDOS: ABAS NO CELULAR E COLUNAS KANBAN NO COMPUTADOR/TABLET */}
      <main className="mx-auto max-w-7xl p-4 sm:px-6 lg:px-8 print:hidden">
        {carregando ? (
          <div className="flex h-64 flex-col items-center justify-center text-xs text-stone-400 gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-stone-500" />
            <span>Atualizando pedidos da cozinha...</span>
          </div>
        ) : (
          <>
            {/* VISUALIZAÇÃO EM COLUNAS NO DESKTOP / TABLET */}
            <div className="hidden md:grid md:grid-cols-4 md:gap-4 items-start">
              {/* Coluna 1: Novos */}
              <div className="flex flex-col rounded-2xl bg-stone-100/90 border border-stone-200/70 p-3.5 min-h-[550px] shadow-2xs">
                <div className="flex items-center justify-between pb-3 px-1 border-b border-stone-200/50 mb-3">
                  <div className="flex items-center gap-1.5 font-titulo text-sm font-bold text-amber-950">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                    <span>Novos Pedidos</span>
                  </div>
                  <span className="flex h-6 px-2 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-950">
                    {pedidosNovos.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {pedidosNovos.map((pedido) => (
                    <CartaoDoPedido
                      key={pedido.id}
                      pedido={pedido}
                      corLoja={loja.cor_principal}
                      aoAvancarSituacao={lidarComAvanco}
                      aoCancelarPedido={lidarComCancelamento}
                      aoImprimir={lidarComImprimir}
                    />
                  ))}
                  {pedidosNovos.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-stone-400 rounded-xl border border-dashed border-stone-200 bg-white/60">
                      <Inbox className="h-7 w-7 text-stone-300 mb-1.5" />
                      <span>Nenhum pedido novo</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna 2: Em Preparo */}
              <div className="flex flex-col rounded-2xl bg-stone-100/90 border border-stone-200/70 p-3.5 min-h-[550px] shadow-2xs">
                <div className="flex items-center justify-between pb-3 px-1 border-b border-stone-200/50 mb-3">
                  <div className="flex items-center gap-1.5 font-titulo text-sm font-bold text-stone-900">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span>Em preparo</span>
                  </div>
                  <span className="flex h-6 px-2 items-center justify-center rounded-full bg-orange-200 text-xs font-bold text-orange-950">
                    {pedidosEmPreparo.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {pedidosEmPreparo.map((pedido) => (
                    <CartaoDoPedido
                      key={pedido.id}
                      pedido={pedido}
                      corLoja={loja.cor_principal}
                      aoAvancarSituacao={lidarComAvanco}
                      aoCancelarPedido={lidarComCancelamento}
                      aoImprimir={lidarComImprimir}
                    />
                  ))}
                  {pedidosEmPreparo.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-stone-400 rounded-xl border border-dashed border-stone-200 bg-white/60">
                      <Flame className="h-7 w-7 text-stone-300 mb-1.5" />
                      <span>Cozinha livre</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna 3: Prontos / Saiu */}
              <div className="flex flex-col rounded-2xl bg-stone-100/90 border border-stone-200/70 p-3.5 min-h-[550px] shadow-2xs">
                <div className="flex items-center justify-between pb-3 px-1 border-b border-stone-200/50 mb-3">
                  <div className="flex items-center gap-1.5 font-titulo text-sm font-bold text-blue-950">
                    <Truck className="h-4 w-4 text-blue-600" />
                    <span>Prontos / Saiu</span>
                  </div>
                  <span className="flex h-6 px-2 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-950">
                    {pedidosProntosOuSaiu.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {pedidosProntosOuSaiu.map((pedido) => (
                    <CartaoDoPedido
                      key={pedido.id}
                      pedido={pedido}
                      corLoja={loja.cor_principal}
                      aoAvancarSituacao={lidarComAvanco}
                      aoCancelarPedido={lidarComCancelamento}
                      aoImprimir={lidarComImprimir}
                    />
                  ))}
                  {pedidosProntosOuSaiu.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-stone-400 rounded-xl border border-dashed border-stone-200 bg-white/60">
                      <Truck className="h-7 w-7 text-stone-300 mb-1.5" />
                      <span>Sem entregas na fila</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna 4: Finalizados */}
              <div className="flex flex-col rounded-2xl bg-stone-100/90 border border-stone-200/70 p-3.5 min-h-[550px] shadow-2xs">
                <div className="flex items-center justify-between pb-3 px-1 border-b border-stone-200/50 mb-3">
                  <div className="flex items-center gap-1.5 font-titulo text-sm font-bold text-stone-700">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <span>Finalizados</span>
                  </div>
                  <span className="flex h-6 px-2 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-950">
                    {pedidosFinalizados.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 max-h-[75vh] overflow-y-auto pr-1">
                  {pedidosFinalizados.map((pedido) => (
                    <CartaoDoPedido
                      key={pedido.id}
                      pedido={pedido}
                      corLoja={loja.cor_principal}
                      aoAvancarSituacao={lidarComAvanco}
                      aoCancelarPedido={lidarComCancelamento}
                      aoImprimir={lidarComImprimir}
                    />
                  ))}
                  {pedidosFinalizados.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-stone-400 rounded-xl border border-dashed border-stone-200 bg-white/60">
                      <CheckCircle className="h-7 w-7 text-stone-300 mb-1.5" />
                      <span>Nenhum pedido finalizado</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* VISUALIZAÇÃO EM ABAS NO CELULAR */}
            <div className="md:hidden space-y-3">
              {abaAtiva === 'novos' && (
                <div className="space-y-3">
                  {pedidosNovos.map((pedido) => (
                    <CartaoDoPedido
                      key={pedido.id}
                      pedido={pedido}
                      corLoja={loja.cor_principal}
                      aoAvancarSituacao={lidarComAvanco}
                      aoCancelarPedido={lidarComCancelamento}
                      aoImprimir={lidarComImprimir}
                    />
                  ))}
                  {pedidosNovos.length === 0 && (
                    <div className="p-8 text-center text-xs text-stone-400 rounded-2xl bg-white border border-stone-200">
                      Nenhum pedido novo no momento.
                    </div>
                  )}
                </div>
              )}

              {abaAtiva === 'preparo' && (
                <div className="space-y-3">
                  {pedidosEmPreparo.map((pedido) => (
                    <CartaoDoPedido
                      key={pedido.id}
                      pedido={pedido}
                      corLoja={loja.cor_principal}
                      aoAvancarSituacao={lidarComAvanco}
                      aoCancelarPedido={lidarComCancelamento}
                      aoImprimir={lidarComImprimir}
                    />
                  ))}
                  {pedidosEmPreparo.length === 0 && (
                    <div className="p-8 text-center text-xs text-stone-400 rounded-2xl bg-white border border-stone-200">
                      Cozinha livre no momento.
                    </div>
                  )}
                </div>
              )}

              {abaAtiva === 'prontos' && (
                <div className="space-y-3">
                  {pedidosProntosOuSaiu.map((pedido) => (
                    <CartaoDoPedido
                      key={pedido.id}
                      pedido={pedido}
                      corLoja={loja.cor_principal}
                      aoAvancarSituacao={lidarComAvanco}
                      aoCancelarPedido={lidarComCancelamento}
                      aoImprimir={lidarComImprimir}
                    />
                  ))}
                  {pedidosProntosOuSaiu.length === 0 && (
                    <div className="p-8 text-center text-xs text-stone-400 rounded-2xl bg-white border border-stone-200">
                      Nenhum pedido aguardando entrega ou retirada.
                    </div>
                  )}
                </div>
              )}

              {abaAtiva === 'finalizados' && (
                <div className="space-y-3">
                  {pedidosFinalizados.map((pedido) => (
                    <CartaoDoPedido
                      key={pedido.id}
                      pedido={pedido}
                      corLoja={loja.cor_principal}
                      aoAvancarSituacao={lidarComAvanco}
                      aoCancelarPedido={lidarComCancelamento}
                      aoImprimir={lidarComImprimir}
                    />
                  ))}
                  {pedidosFinalizados.length === 0 && (
                    <div className="p-8 text-center text-xs text-stone-400 rounded-2xl bg-white border border-stone-200">
                      Nenhum pedido finalizado hoje.
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
