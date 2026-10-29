'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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

  // Armazena IDs dos pedidos já conhecidos para identificar novos e tocar o som
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
      const somSalvo = localStorage.getItem('kodfood_painel_som');
      if (somSalvo !== null) {
        setSomAtivo(somSalvo === 'true');
      }
    } catch {}
  }, []);

  const alternarSom = () => {
    const novoValor = !somAtivo;
    setSomAtivo(novoValor);
    try {
      localStorage.setItem('kodfood_painel_som', String(novoValor));
    } catch {}
  };

  // Polling a cada 5 segundos
  useEffect(() => {
    let cancelado = false;

    const buscarAtualizacoes = async () => {
      try {
        const lista = await listarPedidosDoPainel(loja.id);
        if (cancelado) return;

        setPedidos(lista);

        // Verifica se há novo pedido recebido
        if (!primeiraCargaRef.current) {
          const temNovoRecebido = lista.some(
            (p) => p.situacao === 'recebido' && !idsConhecidosRef.current.has(p.id)
          );
          if (temNovoRecebido && somAtivo) {
            tocarSomNovoPedido();
          }
        }

        // Atualiza a lista de IDs conhecidos
        idsConhecidosRef.current = new Set(lista.map((p) => p.id));
        primeiraCargaRef.current = false;
      } catch (e) {
        console.error('Falha ao atualizar pedidos do painel', e);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    };

    buscarAtualizacoes();
    const intervalo = setInterval(buscarAtualizacoes, 5000);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [loja.id, somAtivo]);

  // Avançar situação com um toque
  const lidarComAvanco = async (pedidoId: string, proximaSituacao: SituacaoPedido) => {
    try {
      const atualizado = await mudarSituacaoDoPedido(pedidoId, proximaSituacao);
      setPedidos((anteriores) =>
        anteriores.map((p) => (p.id === pedidoId ? atualizado : p))
      );
    } catch (e) {
      console.error('Erro ao avançar pedido', e);
    }
  };

  // Cancelar pedido
  const lidarComCancelamento = async (pedidoId: string) => {
    try {
      const atualizado = await mudarSituacaoDoPedido(pedidoId, 'cancelado');
      setPedidos((anteriores) =>
        anteriores.map((p) => (p.id === pedidoId ? atualizado : p))
      );
    } catch (e) {
      console.error('Erro ao cancelar pedido', e);
    }
  };

  // Alternar Loja Aberta / Fechada
  const lidarComAlternarAberta = async () => {
    const novaSituacao = !loja.aberta;
    try {
      const lojaAtualizada = await alternarStatusAbertaLoja(loja.id, novaSituacao);
      setLoja(lojaAtualizada);
    } catch (e) {
      console.error('Erro ao alternar status da loja', e);
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
    <div className="min-h-screen bg-stone-100/70 text-neutro-texto antialiased pb-20 md:pb-6 md:pl-64 print:bg-white print:pl-0 print:pb-0">
      {/* Navegação Responsiva do Painel */}
      <NavegacaoPainel loja={loja} />

      {/* Comanda térmica oculta na tela (só aparece na impressão) */}
      <ComandaImpressao pedido={pedidoParaImprimir} nomeLoja={loja.nome} />

      {/* BARRA SUPERIOR DO PAINEL */}
      <header className="sticky top-0 z-30 border-b border-neutro-borda bg-white shadow-xs print:hidden">
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
                <h1 className="font-titulo text-base font-bold text-neutro-texto">
                  {loja.nome}
                </h1>
                <Link
                  href={`/${loja.link}`}
                  target="_blank"
                  className="hidden sm:inline-flex text-[11px] font-medium text-stone-500 hover:text-stone-800 underline"
                >
                  Ver cardápio ↗
                </Link>
              </div>
              <p className="text-xs text-neutro-secundario">Painel de Pedidos</p>
            </div>
          </div>

          {/* Controles: Cardápio, Aberta/Fechada, Som e Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Atalho para Gestão do Cardápio */}
            <Link
              href={`/painel/cardapio?loja=${loja.link}`}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-xs"
            >
              <UtensilsCrossed className="h-4 w-4" />
              <span className="hidden sm:inline">Gerenciar Cardápio</span>
            </Link>

            {/* Interruptor Loja Aberta / Fechada */}
            <button
              type="button"
              onClick={lidarComAlternarAberta}
              className={`flex h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition-all shadow-xs ${
                loja.aberta
                  ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'border border-stone-300 bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <Power className={`h-4 w-4 ${loja.aberta ? 'text-emerald-700' : 'text-stone-400'}`} />
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
              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                somAtivo
                  ? 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50'
                  : 'border-stone-200 bg-stone-100 text-stone-400'
              }`}
            >
              {somAtivo ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            {/* Sair do Painel */}
            <Link
              href="/painel/entrar"
              title="Trocar de loja ou sair"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* NAVEGAÇÃO POR ABAS NO CELULAR */}
        <div className="flex border-t border-stone-100 px-2 md:hidden">
          <button
            onClick={() => setAbaAtiva('novos')}
            className={`flex-1 py-3 text-center text-xs font-bold transition-colors border-b-2 ${
              abaAtiva === 'novos'
                ? 'border-amber-500 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Novos ({pedidosNovos.length})
          </button>

          <button
            onClick={() => setAbaAtiva('preparo')}
            className={`flex-1 py-3 text-center text-xs font-bold transition-colors border-b-2 ${
              abaAtiva === 'preparo'
                ? 'border-stone-900 text-stone-900 bg-stone-50'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Preparo ({pedidosEmPreparo.length})
          </button>

          <button
            onClick={() => setAbaAtiva('prontos')}
            className={`flex-1 py-3 text-center text-xs font-bold transition-colors border-b-2 ${
              abaAtiva === 'prontos'
                ? 'border-blue-600 text-blue-900 bg-blue-50/50'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Prontos ({pedidosProntosOuSaiu.length})
          </button>

          <button
            onClick={() => setAbaAtiva('finalizados')}
            className={`flex-1 py-3 text-center text-xs font-bold transition-colors border-b-2 ${
              abaAtiva === 'finalizados'
                ? 'border-stone-400 text-stone-700 bg-stone-50'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Fim ({pedidosFinalizados.length})
          </button>
        </div>
      </header>

      {/* ÁREA DE PEDIDOS: ABAS NO CELULAR E COLUNAS KANBAN NO COMPUTADOR/TABLET */}
      <main className="mx-auto max-w-7xl p-4 sm:px-6 lg:px-8 print:hidden">
        {carregando ? (
          <div className="flex h-64 items-center justify-center text-xs text-stone-400">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            <span>Carregando pedidos da lanchonete...</span>
          </div>
        ) : (
          <>
            {/* VISUALIZAÇÃO EM COLUNAS NO DESKTOP / TABLET */}
            <div className="hidden md:grid md:grid-cols-4 md:gap-4 items-start">
              {/* Coluna 1: Novos */}
              <div className="flex flex-col rounded-2xl bg-stone-200/50 p-3 min-h-[500px]">
                <div className="flex items-center justify-between pb-3 px-1">
                  <div className="flex items-center gap-1.5 font-titulo text-sm font-bold text-amber-950">
                    <Inbox className="h-4 w-4 text-amber-700" />
                    <span>Novos</span>
                  </div>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-900">
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
                    <div className="p-6 text-center text-xs text-stone-400">
                      Nenhum pedido novo no momento.
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna 2: Em Preparo */}
              <div className="flex flex-col rounded-2xl bg-stone-200/50 p-3 min-h-[500px]">
                <div className="flex items-center justify-between pb-3 px-1">
                  <div className="flex items-center gap-1.5 font-titulo text-sm font-bold text-stone-900">
                    <Flame className="h-4 w-4 text-orange-600" />
                    <span>Em preparo</span>
                  </div>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-300 text-xs font-bold text-stone-800">
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
                    <div className="p-6 text-center text-xs text-stone-400">
                      Cozinha livre.
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna 3: Prontos / Saiu */}
              <div className="flex flex-col rounded-2xl bg-stone-200/50 p-3 min-h-[500px]">
                <div className="flex items-center justify-between pb-3 px-1">
                  <div className="flex items-center gap-1.5 font-titulo text-sm font-bold text-blue-950">
                    <Truck className="h-4 w-4 text-blue-700" />
                    <span>Prontos / Saiu</span>
                  </div>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-900">
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
                    <div className="p-6 text-center text-xs text-stone-400">
                      Nenhum pedido aguardando entrega ou retirada.
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna 4: Finalizados */}
              <div className="flex flex-col rounded-2xl bg-stone-200/50 p-3 min-h-[500px]">
                <div className="flex items-center justify-between pb-3 px-1">
                  <div className="flex items-center gap-1.5 font-titulo text-sm font-bold text-stone-700">
                    <CheckCircle className="h-4 w-4 text-emerald-700" />
                    <span>Finalizados</span>
                  </div>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-300 text-xs font-bold text-stone-700">
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
                    <div className="p-6 text-center text-xs text-stone-400">
                      Nenhum pedido finalizado hoje.
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
                    <div className="p-8 text-center text-xs text-stone-400 rounded-xl bg-white border border-neutro-borda">
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
                    <div className="p-8 text-center text-xs text-stone-400 rounded-xl bg-white border border-neutro-borda">
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
                    <div className="p-8 text-center text-xs text-stone-400 rounded-xl bg-white border border-neutro-borda">
                      Nenhum pedido aguardando retirada ou entrega.
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
                    <div className="p-8 text-center text-xs text-stone-400 rounded-xl bg-white border border-neutro-borda">
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
