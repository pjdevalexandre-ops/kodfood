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
  Power,
  Inbox,
  Flame,
  Truck,
  CheckCircle,
  Share2,
  Check,
  Search,
  Bike,
  Users,
} from 'lucide-react';
import { Loja, Pedido, SituacaoPedido } from '@/tipos';
import {
  listarPedidosDoPainel,
  mudarSituacaoDoPedido,
  alternarStatusAbertaLoja,
  buscarLojaPeloLink,
} from '@/acesso-aos-dados';
import { tocarSomNovoPedido } from '@/utilitarios/som-notificacao';
import { supabase } from '@/lib/supabase';
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
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'entrega' | 'retirada' | 'mesa'>('todos');
  const [mostrarHistoricoCompleto, setMostrarHistoricoCompleto] = useState(false);

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

  const somAtivoRef = useRef(somAtivo);
  useEffect(() => {
    somAtivoRef.current = somAtivo;
  }, [somAtivo]);

  const alternarSom = () => {
    const novoValor = !somAtivo;
    setSomAtivo(novoValor);
    try {
      localStorage.setItem('kodfood_som_ativo', String(novoValor));
    } catch {}
  };

  // Carrega e atualiza os pedidos em tempo real (Supabase Realtime + Polling leve)
  useEffect(() => {
    let cancelado = false;

    async function carregarPedidos() {
      try {
        const lista = await listarPedidosDoPainel(loja.id);
        if (cancelado) return;

        if (!primeiraCargaRef.current && somAtivoRef.current) {
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
    const intervalo = setInterval(carregarPedidos, 5000);

    // Assinatura em Tempo Real via Supabase Realtime
    const canal = supabase
      .channel(`pedidos-painel-${loja.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedidos',
          filter: `loja_id=eq.${loja.id}`,
        },
        () => {
          carregarPedidos();
        }
      )
      .subscribe();

    return () => {
      cancelado = true;
      clearInterval(intervalo);
      supabase.removeChannel(canal);
    };
  }, [loja.id]);

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

  // Filtra pedidos por busca (nome ou número) e por tipo de atendimento
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      // Filtro por tipo
      if (filtroTipo !== 'todos' && p.tipo !== filtroTipo) {
        return false;
      }
      // Filtro por busca
      if (busca.trim()) {
        const termo = busca.toLowerCase().trim();
        const numeroMatch = String(p.numero).toLowerCase().includes(termo.replace('#', ''));
        const nomeMatch = p.nome_cliente?.toLowerCase().includes(termo);
        const telMatch = p.telefone_cliente?.toLowerCase().includes(termo);
        if (!numeroMatch && !nomeMatch && !telMatch) {
          return false;
        }
      }
      return true;
    });
  }, [pedidos, busca, filtroTipo]);

  // Checa se data é de hoje
  const eDeHoje = (dataIso: string) => {
    const data = new Date(dataIso);
    const hoje = new Date();
    return (
      data.getDate() === hoje.getDate() &&
      data.getMonth() === hoje.getMonth() &&
      data.getFullYear() === hoje.getFullYear()
    );
  };

  // Agrupamento dos pedidos por situação
  const pedidosAguardandoPix = useMemo(
    () => pedidosFiltrados.filter((p) => p.situacao === 'aguardando_pix'),
    [pedidosFiltrados]
  );

  const pedidosNovos = useMemo(
    () => pedidosFiltrados.filter((p) => p.situacao === 'recebido'),
    [pedidosFiltrados]
  );

  const pedidosEmPreparo = useMemo(
    () => pedidosFiltrados.filter((p) => p.situacao === 'confirmado' || p.situacao === 'em_preparo'),
    [pedidosFiltrados]
  );

  const pedidosProntosOuSaiu = useMemo(
    () =>
      pedidosFiltrados.filter(
        (p) => p.situacao === 'pronto_para_retirada' || p.situacao === 'saiu_para_entrega'
      ),
    [pedidosFiltrados]
  );

  const pedidosFinalizadosHoje = useMemo(
    () =>
      pedidosFiltrados.filter(
        (p) => (p.situacao === 'entregue' || p.situacao === 'cancelado') && eDeHoje(p.feito_em)
      ),
    [pedidosFiltrados]
  );

  const pedidosFinalizadosHistorico = useMemo(
    () =>
      pedidosFiltrados.filter(
        (p) => p.situacao === 'entregue' || p.situacao === 'cancelado'
      ),
    [pedidosFiltrados]
  );

  const pedidosFinalizados = mostrarHistoricoCompleto
    ? pedidosFinalizadosHistorico
    : pedidosFinalizadosHoje;

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
        <div className="w-full flex items-center justify-between px-4 py-3 sm:px-8">
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
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/${loja.link}`;
                    navigator.clipboard.writeText(url).then(() => {
                      setLinkCopiado(true);
                      setTimeout(() => setLinkCopiado(false), 2500);
                    });
                  }}
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md transition-all shadow-2xs ${
                    linkCopiado
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                  title="Copiar link oficial do cardápio para enviar a clientes"
                >
                  {linkCopiado ? (
                    <>
                      <Check className="h-3 w-3" />
                      <span>Link copiado!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3 w-3" />
                      <span>Copiar link</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-stone-500">Painel de Pedidos em Tempo Real</p>
            </div>
          </div>

          {/* Controles do Cabeçalho: Status Loja e Som */}
          <div className="flex items-center gap-2 sm:gap-2.5">
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
          </div>
        </div>

        {/* ALERTA DE PEDIDOS AGUARDANDO PIX DO CLIENTE */}
        {pedidosAguardandoPix.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/80 px-4 py-3 shadow-xs">
            <div className="flex items-center gap-2.5 text-xs text-amber-900">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              <span className="font-semibold">
                <strong>{pedidosAguardandoPix.length} pedido(s) aguardando Pix:</strong> O cliente está com o QR Code aberto no app do banco. Assim que o pagamento cair, o pedido entrará automaticamente em Novos Pedidos!
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto">
              {pedidosAguardandoPix.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => lidarComAvanco(p.id, 'recebido')}
                  className="rounded-lg bg-amber-200/80 hover:bg-amber-300 px-2.5 py-1 text-[11px] font-bold text-amber-950 transition-colors shadow-2xs"
                  title="Clique se o cliente enviou o comprovante ou pagou de outra forma"
                >
                  Liberar #{p.numero}
                </button>
              ))}
            </div>
          </div>
        )}

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
      <main className="w-full p-4 sm:px-8 lg:px-10 print:hidden space-y-5">
        {/* BARRA DE FILTROS E BUSCA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200/80 shadow-2xs">
          {/* Campo de Busca por Número ou Nome */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por #número, cliente ou telefone..."
              className="w-full h-9.5 pl-9 pr-8 text-xs rounded-xl border border-stone-200 bg-stone-50/70 focus:bg-white focus:border-stone-400 focus:outline-hidden transition-all text-stone-900 placeholder:text-stone-400"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtros rápidos por tipo de atendimento */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-stone-400 hidden xl:inline pr-1">Filtrar:</span>
            <button
              type="button"
              onClick={() => setFiltroTipo('todos')}
              className={`h-8.5 px-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filtroTipo === 'todos'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFiltroTipo('entrega')}
              className={`inline-flex items-center gap-1 h-8.5 px-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filtroTipo === 'entrega'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100'
              }`}
            >
              <Bike className="h-3.5 w-3.5" />
              <span>Entrega</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltroTipo('retirada')}
              className={`inline-flex items-center gap-1 h-8.5 px-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filtroTipo === 'retirada'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100'
              }`}
            >
              <Store className="h-3.5 w-3.5" />
              <span>Balcão</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltroTipo('mesa')}
              className={`inline-flex items-center gap-1 h-8.5 px-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filtroTipo === 'mesa'
                  ? 'bg-violet-600 text-white shadow-2xs'
                  : 'bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-100'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Mesas</span>
            </button>
          </div>
        </div>

        {/* ALERTA DE PEDIDOS AGUARDANDO PIX DO CLIENTE */}
        {pedidosAguardandoPix.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/80 px-4 py-3 shadow-xs">
            <div className="flex items-center gap-2.5 text-xs text-amber-900">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              <span className="font-semibold">
                <strong>{pedidosAguardandoPix.length} pedido(s) aguardando Pix:</strong> O cliente está com o QR Code aberto no app do banco. Assim que o pagamento cair, o pedido entrará automaticamente em Novos Pedidos!
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto">
              {pedidosAguardandoPix.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => lidarComAvanco(p.id, 'recebido')}
                  className="rounded-lg bg-amber-200/80 hover:bg-amber-300 px-2.5 py-1 text-[11px] font-bold text-amber-950 transition-colors shadow-2xs"
                  title="Clique se o cliente enviou o comprovante ou pagou de outra forma"
                >
                  Liberar #{p.numero}
                </button>
              ))}
            </div>
          </div>
        )}

        {carregando ? (
          <div className="flex h-64 flex-col items-center justify-center text-xs text-stone-400 gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-stone-500" />
            <span>Atualizando pedidos da cozinha...</span>
          </div>
        ) : (
          <>
            {/* VISUALIZAÇÃO EM COLUNAS NO DESKTOP / TABLET */}
            <div className="hidden md:grid md:grid-cols-4 md:gap-4 lg:gap-5 items-start w-full">
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

              {/* Coluna 3: Prontos / Em entrega */}
              <div className="flex flex-col rounded-2xl bg-stone-100/90 border border-stone-200/70 p-3.5 min-h-[550px] shadow-2xs">
                <div className="flex items-center justify-between pb-3 px-1 border-b border-stone-200/50 mb-3">
                  <div className="flex items-center gap-1.5 font-titulo text-sm font-bold text-blue-950">
                    <Truck className="h-4 w-4 text-blue-600" />
                    <span>Prontos / Em entrega</span>
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

              {/* Coluna 4: Finalizados (Hoje + Histórico) */}
              <div className="flex flex-col rounded-2xl bg-stone-100/90 border border-stone-200/70 p-3.5 min-h-[550px] shadow-2xs">
                <div className="flex items-center justify-between pb-2 px-1 border-b border-stone-200/50 mb-3">
                  <div>
                    <div className="flex items-center gap-1.5 font-titulo text-sm font-bold text-stone-700">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span>{mostrarHistoricoCompleto ? 'Histórico Geral' : 'Finalizados hoje'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMostrarHistoricoCompleto(!mostrarHistoricoCompleto)}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 underline transition-colors"
                    >
                      {mostrarHistoricoCompleto ? 'Ver só os de hoje' : 'Ver histórico completo'}
                    </button>
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
                      <span>Nenhum pedido finalizado {mostrarHistoricoCompleto ? '' : 'hoje'}</span>
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
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-stone-600">
                      {mostrarHistoricoCompleto ? 'Histórico Geral' : 'Finalizados hoje'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMostrarHistoricoCompleto(!mostrarHistoricoCompleto)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline"
                    >
                      {mostrarHistoricoCompleto ? 'Ver só os de hoje' : 'Ver histórico completo'}
                    </button>
                  </div>
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
                      Nenhum pedido finalizado {mostrarHistoricoCompleto ? '' : 'hoje'}.
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
