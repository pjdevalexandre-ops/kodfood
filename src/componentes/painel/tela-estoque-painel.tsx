'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  Boxes,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Minus,
  PlusCircle,
  History,
  Search,
  Filter,
  X,
  Sliders,
  ArrowUpDown,
  ShoppingBag,
} from 'lucide-react';
import { Loja, Produto, MovimentacaoEstoque } from '@/tipos';
import {
  listarEstoque,
  adicionarEntradaEstoque,
  ajustarEstoqueManual,
  configurarControleEstoqueProduto,
  buscarLojaPeloLink,
} from '@/acesso-aos-dados';
import { formatarPreco, formatarDataHora } from '@/utilitarios/formatadores';
import { NavegacaoPainel } from './navegacao-painel';

interface TelaEstoquePainelProps {
  lojaInicial: Loja;
}

export function TelaEstoquePainel({ lojaInicial }: TelaEstoquePainelProps) {
  const [loja, setLoja] = useState<Loja>(lojaInicial);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [alertasBaixo, setAlertasBaixo] = useState<Produto[]>([]);
  const [esgotados, setEsgotados] = useState<Produto[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Filtros
  const [abaAtiva, setAbaAtiva] = useState<'produtos' | 'movimentacoes'>('produtos');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'monitorados' | 'baixo' | 'esgotado'>('todos');
  const [busca, setBusca] = useState('');

  // Modais
  const [modalEntrada, setModalEntrada] = useState<Produto | null>(null);
  const [qtdEntrada, setQtdEntrada] = useState(12);
  const [motivoEntrada, setMotivoEntrada] = useState('Compra de mercadoria');

  const [modalAjuste, setModalAjuste] = useState<Produto | null>(null);
  const [novaQtdAjuste, setNovaQtdAjuste] = useState(0);
  const [motivoAjuste, setMotivoAjuste] = useState('Inventário / Contagem física');

  const [modalConfig, setModalConfig] = useState<Produto | null>(null);
  const [configAtivo, setConfigAtivo] = useState(true);
  const [configQtdAtual, setConfigQtdAtual] = useState(10);
  const [configEstoqueMin, setConfigEstoqueMin] = useState(5);

  const [enviando, setEnviando] = useState(false);

  const searchParams = useSearchParams();
  const slug = searchParams.get('loja') || lojaInicial.link;

  const carregarDados = async (lojaId: string) => {
    try {
      const dados = await listarEstoque(lojaId);
      setProdutos(dados.produtos);
      setAlertasBaixo(dados.alertasEstoqueBaixo);
      setEsgotados(dados.esgotados);
      setMovimentacoes(dados.movimentacoes);
    } catch (e) {
      console.error('Erro ao carregar estoque', e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (!slug) return;
    buscarLojaPeloLink(slug).then((l) => {
      if (l) {
        setLoja(l);
        carregarDados(l.id);
      }
    });
  }, [slug]);

  // Ações de Estoque
  const lidarComEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEntrada) return;
    setEnviando(true);

    try {
      await adicionarEntradaEstoque(loja.id, modalEntrada.id, qtdEntrada, motivoEntrada);
      await carregarDados(loja.id);
      setModalEntrada(null);
      setQtdEntrada(12);
    } catch (e) {
      console.error('Erro ao adicionar entrada', e);
    } finally {
      setEnviando(false);
    }
  };

  const lidarComAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAjuste) return;
    setEnviando(true);

    try {
      await ajustarEstoqueManual(loja.id, modalAjuste.id, novaQtdAjuste, motivoAjuste);
      await carregarDados(loja.id);
      setModalAjuste(null);
    } catch (e) {
      console.error('Erro ao ajustar estoque', e);
    } finally {
      setEnviando(false);
    }
  };

  const lidarComConfigurar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalConfig) return;
    setEnviando(true);

    try {
      await configurarControleEstoqueProduto(loja.id, modalConfig.id, {
        controlar_estoque: configAtivo,
        quantidade_estoque: configQtdAtual,
        estoque_minimo: configEstoqueMin,
      });
      await carregarDados(loja.id);
      setModalConfig(null);
    } catch (e) {
      console.error('Erro ao configurar controle de estoque', e);
    } finally {
      setEnviando(false);
    }
  };

  // Ajuste rápido de 1 unidade (+ ou -)
  const ajusteRapido = async (produto: Produto, delta: number) => {
    const atual = produto.quantidade_estoque || 0;
    const novo = Math.max(0, atual + delta);
    try {
      await ajustarEstoqueManual(
        loja.id,
        produto.id,
        novo,
        delta > 0 ? 'Ajuste rápido (+1)' : 'Ajuste rápido (-1)'
      );
      await carregarDados(loja.id);
    } catch (e) {
      console.error('Erro no ajuste rápido', e);
    }
  };

  // Filtragem de Produtos
  const produtosFiltrados = produtos.filter((prod) => {
    const bateTexto =
      prod.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (prod.descricao || '').toLowerCase().includes(busca.toLowerCase());

    if (!bateTexto) return false;

    if (filtroTipo === 'monitorados') return prod.controlar_estoque;
    if (filtroTipo === 'baixo') {
      return (
        prod.controlar_estoque &&
        (prod.quantidade_estoque || 0) <= (prod.estoque_minimo || 5) &&
        (prod.quantidade_estoque || 0) > 0
      );
    }
    if (filtroTipo === 'esgotado') {
      return prod.controlar_estoque && (prod.quantidade_estoque || 0) <= 0;
    }

    return true;
  });

  const totalMonitorados = produtos.filter((p) => p.controlar_estoque).length;

  return (
    <div className="min-h-screen bg-stone-100/70 text-neutro-texto antialiased pb-24 md:pb-12 md:pl-64">
      {/* Navegação Responsiva */}
      <NavegacaoPainel loja={loja} />

      {/* CABEÇALHO */}
      <header className="sticky top-0 z-20 border-b border-neutro-borda bg-white shadow-xs px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold"
              style={{ backgroundColor: loja.cor_principal }}
            >
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-titulo text-base font-bold text-neutro-texto">
                Controle de Estoque
              </h1>
              <p className="text-xs text-neutro-secundario">
                {loja.nome} · Baixas automáticas de pedidos e reposições
              </p>
            </div>
          </div>

          {/* Abas Produtos vs Histórico */}
          <div className="flex items-center rounded-xl border border-stone-200 bg-stone-50 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAbaAtiva('produtos')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                abaAtiva === 'produtos'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Produtos ({produtos.length})
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('movimentacoes')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                abaAtiva === 'movimentacoes'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Movimentações ({movimentacoes.length})
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="mx-auto max-w-5xl p-4 sm:px-6 space-y-6">
        {abaAtiva === 'produtos' ? (
          <>
            {/* 3 CARDS DE STATUS DO ESTOQUE */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {/* 1. Monitorados */}
              <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span className="font-medium">Itens com Estoque Ativo</span>
                  <Boxes className="h-4 w-4 text-stone-600" />
                </div>
                <div className="font-titulo text-2xl font-bold text-stone-900">
                  {totalMonitorados}
                </div>
                <p className="text-[11px] text-stone-400">
                  de {produtos.length} produtos cadastrados
                </p>
              </div>

              {/* 2. Estoque Baixo */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs text-amber-800">
                  <span className="font-medium">Estoque Baixo</span>
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <div className="font-titulo text-2xl font-bold text-amber-900">
                  {alertasBaixo.length}
                </div>
                <p className="text-[11px] text-amber-700">
                  Abaixo do limite mínimo configurado
                </p>
              </div>

              {/* 3. Esgotados */}
              <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs text-rose-800">
                  <span className="font-medium">Esgotados (Zero)</span>
                  <XCircle className="h-4 w-4 text-rose-600" />
                </div>
                <div className="font-titulo text-2xl font-bold text-rose-900">
                  {esgotados.length}
                </div>
                <p className="text-[11px] text-rose-700">
                  Pausados automaticamente no cardápio
                </p>
              </div>
            </div>

            {/* BARRA DE FILTROS E BUSCA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-neutro-borda bg-white p-3.5 shadow-xs">
              {/* Campo de Busca */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar produto..."
                  className="w-full rounded-xl border border-stone-200 pl-9 pr-3 py-1.5 text-xs text-stone-900 focus:border-stone-800 focus:outline-none"
                />
              </div>

              {/* Filtros Rápidos */}
              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto text-xs">
                <button
                  type="button"
                  onClick={() => setFiltroTipo('todos')}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                    filtroTipo === 'todos'
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipo('monitorados')}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                    filtroTipo === 'monitorados'
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  Monitorados ({totalMonitorados})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipo('baixo')}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                    filtroTipo === 'baixo'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  Baixo ({alertasBaixo.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipo('esgotado')}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                    filtroTipo === 'esgotado'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                  }`}
                >
                  Esgotados ({esgotados.length})
                </button>
              </div>
            </div>

            {/* LISTA DE PRODUTOS */}
            <div className="rounded-2xl border border-neutro-borda bg-white shadow-xs overflow-hidden">
              {produtosFiltrados.length === 0 ? (
                <div className="py-16 text-center text-xs text-stone-400">
                  Nenhum produto encontrado com os filtros selecionados.
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {produtosFiltrados.map((prod) => {
                    const eMonitorado = prod.controlar_estoque;
                    const qtd = prod.quantidade_estoque || 0;
                    const min = prod.estoque_minimo || 5;
                    const estaEsgotado = eMonitorado && qtd <= 0;
                    const estaBaixo = eMonitorado && qtd <= min && qtd > 0;

                    return (
                      <div
                        key={prod.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/50 transition-colors"
                      >
                        {/* Identificação do Produto */}
                        <div className="flex items-center gap-3 min-w-0">
                          {prod.foto_url ? (
                            <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-stone-200 shrink-0">
                              <Image src={prod.foto_url} alt={prod.nome} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-stone-500 font-bold text-xs shrink-0">
                              {prod.nome.charAt(0)}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-xs text-stone-900 truncate">
                                {prod.nome}
                              </h3>
                              <span className="text-[11px] font-bold text-stone-500">
                                {formatarPreco(prod.preco_centavos)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                              {eMonitorado ? (
                                estaEsgotado ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
                                    <XCircle className="h-3 w-3 text-rose-600" />
                                    Esgotado (Pausado no cardápio)
                                  </span>
                                ) : estaBaixo ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                                    Estoque baixo (mínimo: {min})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                                    <CheckCircle className="h-3 w-3 text-emerald-600" />
                                    Normal (mínimo: {min})
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
                                  Sem controle de estoque
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Controles de Estoque e Ações */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                          {eMonitorado ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => ajusteRapido(prod, -1)}
                                title="Reduzir 1 unidade"
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 transition-colors font-bold text-xs"
                              >
                                -
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setModalAjuste(prod);
                                  setNovaQtdAjuste(qtd);
                                }}
                                title="Clique para editar valor exato"
                                className="min-w-[48px] px-2 py-1 rounded-lg bg-stone-100 text-center font-bold text-xs text-stone-900 hover:bg-stone-200 transition-colors"
                              >
                                {qtd} un
                              </button>

                              <button
                                type="button"
                                onClick={() => ajusteRapido(prod, 1)}
                                title="Adicionar 1 unidade"
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 transition-colors font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-stone-400 italic">Ilimitado</span>
                          )}

                          <div className="flex items-center gap-1.5">
                            {eMonitorado && (
                              <button
                                type="button"
                                onClick={() => {
                                  setModalEntrada(prod);
                                  setQtdEntrada(12);
                                  setMotivoEntrada('Compra de mercadoria');
                                }}
                                className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                              >
                                <PlusCircle className="h-3.5 w-3.5" />
                                <span>+ Entrada</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setModalConfig(prod);
                                setConfigAtivo(!!prod.controlar_estoque);
                                setConfigQtdAtual(prod.quantidade_estoque || 0);
                                setConfigEstoqueMin(prod.estoque_minimo || 5);
                              }}
                              className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
                            >
                              <Sliders className="h-3.5 w-3.5 text-stone-500" />
                              <span>{eMonitorado ? 'Configurar' : 'Ativar Controle'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ABA DE MOVIMENTAÇÕES / AUDITORIA */
          <div className="rounded-2xl border border-neutro-borda bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="font-titulo text-sm font-bold text-neutro-texto">
                  Auditoria de Movimentações de Estoque
                </h2>
                <p className="text-xs text-stone-500">
                  Histórico de vendas, compras, estornos e ajustes manuais
                </p>
              </div>
            </div>

            {movimentacoes.length === 0 ? (
              <div className="py-16 text-center text-xs text-stone-400">
                Nenhuma movimentação de estoque registrada ainda.
              </div>
            ) : (
              <div className="divide-y divide-stone-100 text-xs">
                {movimentacoes.map((mov) => {
                  const eEntrada = mov.quantidade > 0;

                  return (
                    <div
                      key={mov.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              mov.tipo === 'saida_venda'
                                ? 'bg-blue-50 text-blue-800'
                                : mov.tipo === 'entrada'
                                ? 'bg-emerald-50 text-emerald-800'
                                : mov.tipo === 'perda_descarte'
                                ? 'bg-rose-50 text-rose-800'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {mov.tipo === 'saida_venda'
                              ? 'Baixa por Venda'
                              : mov.tipo === 'entrada'
                              ? 'Entrada / Compra'
                              : mov.tipo === 'perda_descarte'
                              ? 'Perda / Descarte'
                              : 'Ajuste / Estorno'}
                          </span>
                          <span className="font-bold text-stone-900">
                            {mov.nome_produto}
                          </span>
                        </div>

                        <p className="text-[11px] text-stone-500">
                          {mov.motivo} · De {mov.estoque_anterior} para {mov.estoque_novo} un
                        </p>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span
                          className={`font-bold text-sm ${
                            eEntrada ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {eEntrada ? '+' : ''}
                          {mov.quantidade} un
                        </span>
                        <span className="text-[11px] text-stone-400">
                          {formatarDataHora(mov.data_hora)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL: REGISTRAR ENTRADA DE MERCADORIA */}
      {modalEntrada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-titulo text-sm font-bold text-stone-900">
                  + Entrada de Mercadoria
                </h3>
                <p className="text-xs text-stone-500">{modalEntrada.nome}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalEntrada(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={lidarComEntrada} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Quantidade a Adicionar (unidades) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={qtdEntrada}
                  onChange={(e) => setQtdEntrada(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs font-bold text-stone-900 focus:border-stone-800 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-stone-500">
                  Estoque atual: {modalEntrada.quantidade_estoque || 0} un → Ficará com:{' '}
                  {(modalEntrada.quantidade_estoque || 0) + qtdEntrada} un.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Motivo / Observação
                </label>
                <input
                  type="text"
                  required
                  value={motivoEntrada}
                  onChange={(e) => setMotivoEntrada(e.target.value)}
                  placeholder="Ex.: Compra NF 1234 Distribuidora"
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:border-stone-800 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalEntrada(null)}
                  className="flex-1 rounded-xl border border-stone-200 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando}
                  className="flex-1 rounded-xl bg-emerald-700 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50"
                >
                  {enviando ? 'Registrando...' : 'Confirmar Entrada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AJUSTE MANUAL DE ESTOQUE (INVENTÁRIO) */}
      {modalAjuste && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-titulo text-sm font-bold text-stone-900">
                  Ajustar Estoque
                </h3>
                <p className="text-xs text-stone-500">{modalAjuste.nome}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalAjuste(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={lidarComAjuste} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Nova Quantidade Física em Estoque *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={novaQtdAjuste}
                  onChange={(e) => setNovaQtdAjuste(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs font-bold text-stone-900 focus:border-stone-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Motivo do Ajuste *
                </label>
                <input
                  type="text"
                  required
                  value={motivoAjuste}
                  onChange={(e) => setMotivoAjuste(e.target.value)}
                  placeholder="Ex.: Inventário semanal, produto avariado..."
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:border-stone-800 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAjuste(null)}
                  className="flex-1 rounded-xl border border-stone-200 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando}
                  className="flex-1 rounded-xl bg-stone-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-stone-800 disabled:opacity-50"
                >
                  {enviando ? 'Salvando...' : 'Salvar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURAÇÃO DE CONTROLE DE ESTOQUE */}
      {modalConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-titulo text-sm font-bold text-stone-900">
                  Configuração de Estoque
                </h3>
                <p className="text-xs text-stone-500">{modalConfig.nome}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalConfig(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={lidarComConfigurar} className="space-y-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-stone-200 bg-stone-50">
                <input
                  type="checkbox"
                  checked={configAtivo}
                  onChange={(e) => setConfigAtivo(e.target.checked)}
                  className="rounded border-stone-300"
                />
                <div>
                  <span className="font-semibold text-stone-900 block">
                    Controlar estoque deste produto
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Dá baixa automática a cada pedido e pausa se zerar.
                  </span>
                </div>
              </label>

              {configAtivo && (
                <>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Quantidade Atual em Estoque
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={configQtdAtual}
                      onChange={(e) => setConfigQtdAtual(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full rounded-xl border border-stone-300 p-2.5 text-xs font-bold text-stone-900 focus:border-stone-800 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Estoque Mínimo para Alerta
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={configEstoqueMin}
                      onChange={(e) => setConfigEstoqueMin(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full rounded-xl border border-stone-300 p-2.5 text-xs font-bold text-stone-900 focus:border-stone-800 focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] text-stone-500">
                      Gera alerta visual quando restar esta quantidade ou menos.
                    </p>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalConfig(null)}
                  className="flex-1 rounded-xl border border-stone-200 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando}
                  className="flex-1 rounded-xl bg-stone-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-stone-800 disabled:opacity-50"
                >
                  {enviando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
