'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  Plus,
  Receipt,
  CheckCircle2,
  Clock,
  Printer,
  QrCode,
  DollarSign,
  Utensils,
  X,
  CreditCard,
  Banknote,
  Search,
  Settings,
} from 'lucide-react';
import { Loja, Mesa, Pedido, Categoria, Produto, FormaPagamento } from '@/tipos';
import {
  listarMesas,
  abrirMesa,
  lancarPedidoMesa,
  solicitarContaMesa,
  fecharContaMesa,
  configurarQuantidadeMesas,
  obterCardapioCompletoParaPainel,
  listarPedidosDoPainel,
  buscarLojaPeloLink,
} from '@/acesso-aos-dados';
import {
  formatarPreco,
  formatarDataHora,
  converterTextoMoedaParaCentavos,
  formatarMoedaDigitada,
} from '@/utilitarios/formatadores';
import { NavegacaoPainel } from './navegacao-painel';

interface TelaMesasPainelProps {
  lojaInicial: Loja;
  mesasIniciais?: Mesa[];
  pedidosIniciais?: Pedido[];
  categoriasIniciais?: Categoria[];
  produtosIniciais?: Produto[];
}

export function TelaMesasPainel({
  lojaInicial,
  mesasIniciais = [],
  pedidosIniciais = [],
  categoriasIniciais = [],
  produtosIniciais = [],
}: TelaMesasPainelProps) {
  const [loja, setLoja] = useState<Loja>(lojaInicial);
  const [mesas, setMesas] = useState<Mesa[]>(mesasIniciais);
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciais);
  const [categorias, setCategorias] = useState<Categoria[]>(categoriasIniciais);
  const [produtos, setProdutos] = useState<Produto[]>(produtosIniciais);
  const [carregando, setCarregando] = useState(false);

  // Modais
  const [mesaSelecionada, setMesaSelecionada] = useState<Mesa | null>(null);
  const [modalAbrirMesa, setModalAbrirMesa] = useState<Mesa | null>(null);
  const [nomeClienteAbrir, setNomeClienteAbrir] = useState('');

  const [modalPdvMesa, setModalPdvMesa] = useState<Mesa | null>(null);
  const [categoriaPdv, setCategoriaPdv] = useState<string>('todas');
  const [buscaPdv, setBuscaPdv] = useState<string>('');
  const [itensPdv, setItensPdv] = useState<Array<{ produto: Produto; quantidade: number; observacao?: string }>>([]);

  const [modalContaMesa, setModalContaMesa] = useState<Mesa | null>(null);
  const [dividirPessoas, setDividirPessoas] = useState(1);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [incluirServico10, setIncluirServico10] = useState(false);

  const [modalConfigMesas, setModalConfigMesas] = useState(false);
  const [qtdMesasInput, setQtdMesasInput] = useState(10);

  const [modalQrCodes, setModalQrCodes] = useState(false);

  // Extrato térmico para impressão
  const [extratoImpressao, setExtratoImpressao] = useState<{
    mesa: Mesa;
    pedidos: Pedido[];
    totalCentavos: number;
  } | null>(null);

  const searchParams = useSearchParams();
  const slug = searchParams.get('loja') || lojaInicial.link;

  const carregarTudo = async (lojaId: string) => {
    try {
      const [listaMesas, listaPedidos, dadosCardapio] = await Promise.all([
        listarMesas(lojaId),
        listarPedidosDoPainel(lojaId),
        obterCardapioCompletoParaPainel(lojaId),
      ]);
      setMesas(listaMesas);
      setPedidos(listaPedidos);
      if (dadosCardapio) {
        if (dadosCardapio.categorias && dadosCardapio.categorias.length > 0) {
          setCategorias(dadosCardapio.categorias);
        }
        if (dadosCardapio.produtos && dadosCardapio.produtos.length > 0) {
          setProdutos(dadosCardapio.produtos);
        }
      }
      setQtdMesasInput(listaMesas.length);
    } catch (e) {
      console.error('Erro ao carregar mesas', e);
    }
  };

  useEffect(() => {
    if (loja.id) {
      carregarTudo(loja.id);
    }
  }, [slug, loja.id]);

  // Abertura de Mesa
  const lidarComAbrirMesa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAbrirMesa) return;

    try {
      await abrirMesa(loja.id, modalAbrirMesa.id, nomeClienteAbrir);
      await carregarTudo(loja.id);
      setModalAbrirMesa(null);
      setNomeClienteAbrir('');
    } catch (e) {
      console.error('Erro ao abrir mesa', e);
    }
  };

  // Lançamento de Pedido na Mesa (PDV)
  const adicionarAoPdv = (prod: Produto) => {
    setItensPdv((prev) => {
      const idx = prev.findIndex((i) => i.produto.id === prod.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx].quantidade += 1;
        return copy;
      }
      return [...prev, { produto: prod, quantidade: 1 }];
    });
  };

  const alterarQtdPdv = (produtoId: string, novaQtd: number) => {
    if (novaQtd <= 0) {
      setItensPdv((prev) => prev.filter((i) => i.produto.id !== produtoId));
    } else {
      setItensPdv((prev) =>
        prev.map((i) => (i.produto.id === produtoId ? { ...i, quantidade: novaQtd } : i))
      );
    }
  };

  const lidarComEnviarPedidoMesa = async () => {
    if (!modalPdvMesa || itensPdv.length === 0) return;

    try {
      await lancarPedidoMesa(
        loja.id,
        modalPdvMesa.id,
        itensPdv.map((item) => ({
          produtoId: item.produto.id,
          quantidade: item.quantidade,
          observacao: item.observacao,
        }))
      );
      await carregarTudo(loja.id);
      setModalPdvMesa(null);
      setItensPdv([]);
    } catch (e) {
      console.error('Erro ao lançar pedido na mesa', e);
    }
  };

  // Fechamento de Conta
  const lidarComFecharConta = async () => {
    if (!modalContaMesa) return;

    const subtotal = modalContaMesa.total_centavos;
    const taxaServico = incluirServico10 ? Math.round(subtotal * 0.1) : 0;
    const totalComServico = subtotal + taxaServico;

    try {
      await fecharContaMesa(loja.id, modalContaMesa.id, {
        forma: formaPagamento,
        valorPagoCentavos: totalComServico,
      });
      await carregarTudo(loja.id);
      setModalContaMesa(null);
      setDividirPessoas(1);
    } catch (e) {
      console.error('Erro ao fechar conta', e);
    }
  };

  const imprimirExtrato = (mesa: Mesa) => {
    const pedidosMesa = pedidos.filter((p) => mesa.pedidos_ids.includes(p.id));
    const subtotal = mesa.total_centavos;
    const taxaServico = incluirServico10 ? Math.round(subtotal * 0.1) : 0;
    const totalFinal = subtotal + taxaServico;

    setExtratoImpressao({
      mesa,
      pedidos: pedidosMesa,
      totalCentavos: totalFinal,
    });

    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Ajuste da quantidade de mesas
  const lidarComConfigurarMesas = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await configurarQuantidadeMesas(loja.id, qtdMesasInput);
      await carregarTudo(loja.id);
      setModalConfigMesas(false);
    } catch (e) {
      console.error('Erro ao configurar mesas', e);
    }
  };

  // Contadores
  const mesasLivres = mesas.filter((m) => m.status === 'livre').length;
  const mesasOcupadas = mesas.filter((m) => m.status === 'ocupada').length;
  const mesasConta = mesas.filter((m) => m.status === 'conta').length;

  const totalConsumidoSalao = mesas.reduce((acc, m) => acc + (m.total_centavos || 0), 0);

  const produtosFiltradosPdv = produtos
    .filter((p) => p.disponivel)
    .filter((p) => (categoriaPdv === 'todas' ? true : p.categoria_id === categoriaPdv))
    .filter((p) =>
      buscaPdv.trim() ? p.nome.toLowerCase().includes(buscaPdv.trim().toLowerCase()) : true
    );

  return (
    <div className="min-h-screen bg-stone-100/70 text-neutro-texto antialiased pb-24 md:pb-12 md:pl-64 print:bg-white print:min-h-0 print:h-auto print:p-0 print:m-0">
      {/* Navegação Responsiva */}
      <div className="print:hidden">
        <NavegacaoPainel loja={loja} />
      </div>

      {/* EXTRATO DA MESA PARA IMPRESSÃO TÉRMICA 80MM */}
      {extratoImpressao && (
        <div className="hidden print:block font-mono text-[11px] leading-tight text-black max-w-[80mm] p-2 mx-auto">
          <div className="text-center pb-2 border-b border-black">
            <h1 className="font-bold text-sm uppercase">{loja.nome}</h1>
            <p className="font-bold text-base mt-1">{extratoImpressao.mesa.nome_identificador}</p>
            {extratoImpressao.mesa.cliente_nome && (
              <p className="text-[10px]">Cliente: {extratoImpressao.mesa.cliente_nome}</p>
            )}
            <p className="text-[10px]">Data: {formatarDataHora(new Date().toISOString())}</p>
          </div>

          <div className="py-2 border-b border-black">
            <p className="font-bold uppercase text-[10px] mb-1">Itens Consumidos:</p>
            <div className="space-y-1">
              {extratoImpressao.pedidos.flatMap((p) => p.itens || []).map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.quantidade}x {item.nome_produto}</span>
                  <span>{formatarPreco(item.preco_unitario_centavos * item.quantidade)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="py-2 border-b border-black space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatarPreco(extratoImpressao.mesa.total_centavos)}</span>
            </div>
            {incluirServico10 && (
              <div className="flex justify-between">
                <span>Taxa de Serviço (10%):</span>
                <span>{formatarPreco(Math.round(extratoImpressao.mesa.total_centavos * 0.1))}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-1 border-t border-dashed border-black text-xs">
              <span>TOTAL DA CONTA:</span>
              <span>{formatarPreco(extratoImpressao.totalCentavos)}</span>
            </div>
            {dividirPessoas > 1 && (
              <div className="flex justify-between text-[10px] pt-1">
                <span>Dividido por {dividirPessoas} pessoas:</span>
                <span>{formatarPreco(Math.round(extratoImpressao.totalCentavos / dividirPessoas))} cada</span>
              </div>
            )}
          </div>

          <div className="text-center pt-3 text-[9px]">
            <p>Agradecemos a preferência!</p>
          </div>
        </div>
      )}

      {/* CABEÇALHO */}
      <header className="sticky top-0 z-20 border-b border-neutro-borda bg-white shadow-xs py-3 print:hidden">
        <div className="w-full flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold"
              style={{ backgroundColor: loja.cor_principal }}
            >
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-titulo text-base font-bold text-neutro-texto">
                  Mesas & Comandas
                </h1>
                <span className="hidden sm:inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
                  {mesas.length} mesas
                </span>
              </div>
              <p className="text-xs text-neutro-secundario">
                {loja.nome} · Salão, comanda presencial e fechamento de conta
              </p>
            </div>
          </div>

          {/* Botões de Ações */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalQrCodes(true)}
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-xs"
            >
              <QrCode className="h-4 w-4 text-stone-500" />
              <span className="hidden sm:inline">QR Codes</span>
            </button>

            <button
              type="button"
              onClick={() => setModalConfigMesas(true)}
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-xs"
            >
              <Settings className="h-4 w-4 text-stone-500" />
              <span className="hidden sm:inline">Ajustar Mesas</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="w-full p-4 sm:px-8 space-y-6 print:hidden">
        {/* BARRA DE STATUS DO SALÃO */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutro-borda bg-white p-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="font-semibold text-stone-700">
                {mesasLivres} {mesasLivres === 1 ? 'Mesa Livre' : 'Mesas Livres'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-semibold text-stone-700">
                {mesasOcupadas} {mesasOcupadas === 1 ? 'Ocupada' : 'Ocupadas'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-500 animate-bounce" />
              <span className="font-semibold text-stone-700">
                {mesasConta} {mesasConta === 1 ? 'Pediu a Conta' : 'Pediram a Conta'}
              </span>
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="text-stone-400 block text-[11px]">Consumo em Aberto no Salão</span>
            <span className="font-titulo text-base font-bold text-stone-900">
              {formatarPreco(totalConsumidoSalao)}
            </span>
          </div>
        </div>

        {/* GRADE DE MESAS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {mesas.map((mesa) => {
            const estaLivre = mesa.status === 'livre';
            const pediuConta = mesa.status === 'conta';

            return (
              <div
                key={mesa.id}
                className={`flex flex-col justify-between rounded-2xl border p-4 shadow-xs transition-all ${
                  estaLivre
                    ? 'border-emerald-200 bg-white hover:border-emerald-400'
                    : pediuConta
                    ? 'border-rose-300 bg-rose-50/50 ring-2 ring-rose-400/30'
                    : 'border-amber-300 bg-amber-50/30 ring-1 ring-amber-300'
                }`}
              >
                <div>
                  {/* Topo da Mesa */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        estaLivre
                          ? 'bg-emerald-50 text-emerald-800'
                          : pediuConta
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {estaLivre ? 'Livre' : pediuConta ? 'Conta' : 'Ocupada'}
                    </span>

                    <span className="text-[11px] font-mono text-stone-400">
                      Cap: {mesa.capacidade || 4}
                    </span>
                  </div>

                  <h3 className="font-titulo text-lg font-bold text-stone-900">
                    {mesa.nome_identificador}
                  </h3>

                  {mesa.cliente_nome && (
                    <p className="text-xs text-stone-600 truncate mt-0.5">
                      {mesa.cliente_nome}
                    </p>
                  )}

                  {!estaLivre && (
                    <div className="mt-3 pt-2 border-t border-stone-200/60 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-stone-500">Consumo:</span>
                        <span className="font-bold text-stone-900">
                          {formatarPreco(mesa.total_centavos)}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {mesa.aberta_em ? formatarDataHora(mesa.aberta_em).split(' ')[1] : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Ações da Mesa */}
                <div className="mt-4 pt-2">
                  {estaLivre ? (
                    <button
                      type="button"
                      onClick={() => {
                        setNomeClienteAbrir('');
                        setModalAbrirMesa(mesa);
                      }}
                      className="w-full flex items-center justify-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Abrir Mesa</span>
                    </button>
                  ) : (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCategoriaPdv('todas');
                          setBuscaPdv('');
                          setModalPdvMesa(mesa);
                          setItensPdv([]);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition-colors shadow-2xs active:scale-[0.98]"
                      >
                        <Plus className="h-4 w-4 shrink-0" />
                        <span>Pedido</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setModalContaMesa(mesa);
                          setDividirPessoas(1);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs active:scale-95 shrink-0"
                        title="Ver conta / Fechar"
                      >
                        <Receipt className="h-4 w-4 shrink-0 text-stone-600" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* MODAL: ABRIR MESA */}
      {modalAbrirMesa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-titulo text-sm font-bold text-stone-900">
                Abrir {modalAbrirMesa.nome_identificador}
              </h3>
              <button
                type="button"
                onClick={() => setModalAbrirMesa(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={lidarComAbrirMesa} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nome do Cliente (Opcional)
                </label>
                <input
                  type="text"
                  value={nomeClienteAbrir}
                  onChange={(e) => setNomeClienteAbrir(e.target.value)}
                  placeholder="Ex.: Lucas e amigos"
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:border-stone-800 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAbrirMesa(null)}
                  className="flex-1 rounded-xl border border-stone-200 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white shadow-xs hover:opacity-95"
                  style={{ backgroundColor: loja.cor_principal }}
                >
                  Abrir Mesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LANÇAMENTO RÁPIDO PDV NA MESA */}
      {modalPdvMesa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-4xl h-[90vh] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden border border-stone-200">
            {/* Topo do PDV */}
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3.5 bg-stone-50/80">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold shadow-2xs"
                  style={{ backgroundColor: loja.cor_principal }}
                >
                  <Utensils className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-titulo text-base font-extrabold text-stone-900 leading-tight">
                    Lançar na {modalPdvMesa.nome_identificador}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {modalPdvMesa.cliente_nome ? `Cliente: ${modalPdvMesa.cliente_nome}` : 'Mesa em atendimento'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModalPdvMesa(null);
                  setBuscaPdv('');
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200/60 text-stone-500 hover:bg-stone-200 hover:text-stone-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Conteúdo Duplo: Cardápio à esquerda, Itens à direita */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Esquerda: Busca, Seletor de categorias e lista de produtos */}
              <div className="flex-1 flex flex-col border-r border-stone-200 overflow-hidden bg-stone-50/30">
                {/* Barra de Busca + Categorias */}
                <div className="p-3 border-b border-stone-200 bg-white space-y-2.5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                    <input
                      type="text"
                      value={buscaPdv}
                      onChange={(e) => setBuscaPdv(e.target.value)}
                      placeholder="Buscar produto pelo nome..."
                      className="w-full rounded-xl border border-stone-200 pl-9 pr-3 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:border-stone-400 focus:bg-white bg-stone-50/70 focus:outline-hidden transition-all"
                    />
                    {buscaPdv && (
                      <button
                        type="button"
                        onClick={() => setBuscaPdv('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Abas de categorias */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setCategoriaPdv('todas')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all shadow-2xs ${
                        categoriaPdv === 'todas'
                          ? 'bg-stone-900 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      Todos
                    </button>
                    {categorias.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoriaPdv(cat.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all shadow-2xs ${
                          categoriaPdv === cat.id
                            ? 'bg-stone-900 text-white shadow-xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {cat.nome}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grade de produtos com cards modernos (sem esticar!) */}
                <div className="flex-1 overflow-y-auto p-3.5 grid grid-cols-2 sm:grid-cols-3 gap-3 content-start auto-rows-max">
                  {produtosFiltradosPdv.map((prod) => {
                    const itemNoPdv = itensPdv.find((i) => i.produto.id === prod.id);
                    const qtdAtual = itemNoPdv ? itemNoPdv.quantidade : 0;
                    const catDoProd = categorias.find((c) => c.id === prod.categoria_id)?.nome;

                    return (
                      <div
                        key={prod.id}
                        onClick={() => adicionarAoPdv(prod)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') adicionarAoPdv(prod);
                        }}
                        className={`group relative flex flex-col justify-between text-left rounded-2xl border p-3 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 select-none ${
                          qtdAtual > 0
                            ? 'border-stone-900 bg-white shadow-md ring-2 ring-stone-900/10'
                            : 'border-stone-200/90 bg-white hover:border-stone-300 hover:shadow-md shadow-2xs'
                        }`}
                      >
                        {/* Topo do card: Categoria e Badge de itens adicionados */}
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider truncate max-w-[120px]">
                            {catDoProd || 'Item'}
                          </span>
                          {qtdAtual > 0 && (
                            <span
                              className="inline-flex items-center justify-center text-[10px] font-black text-white px-2 py-0.5 rounded-full shadow-2xs"
                              style={{ backgroundColor: loja.cor_principal }}
                            >
                              {qtdAtual}x no pedido
                            </span>
                          )}
                        </div>

                        {/* Conteúdo central: Imagem/Ícone e Nome */}
                        <div className="flex items-center gap-2.5 my-1">
                          {prod.foto_url ? (
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-stone-100 border border-stone-100">
                              <img
                                src={prod.foto_url}
                                alt={prod.nome}
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            </div>
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-orange-100 text-amber-700 border border-amber-200/60 shadow-2xs">
                              <Utensils className="h-4 w-4" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-xs text-stone-900 line-clamp-2 leading-tight group-hover:text-stone-950">
                              {prod.nome}
                            </h4>
                            {prod.descricao && (
                              <p className="text-[10px] text-stone-400 line-clamp-1 mt-0.5">
                                {prod.descricao}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Rodapé: Preço em destaque e Botão Adicionar */}
                        <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">Valor</span>
                            <span className="font-black text-xs text-stone-900">
                              {formatarPreco(prod.preco_centavos)}
                            </span>
                          </div>

                          <span
                            className="flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all shadow-2xs group-hover:scale-105 active:scale-95"
                            style={{
                              backgroundColor: qtdAtual > 0 ? loja.cor_principal : '#1c1917',
                              color: '#ffffff',
                            }}
                          >
                            <Plus className="h-3 w-3" />
                            <span>Adicionar</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {produtosFiltradosPdv.length === 0 && (
                    <div className="col-span-full py-16 text-center text-xs text-stone-400">
                      Nenhum produto encontrado com o filtro atual.
                    </div>
                  )}
                </div>
              </div>

              {/* Direita: Resumo dos itens a lançar */}
              <div className="w-full md:w-88 flex flex-col bg-stone-50/70 justify-between">
                <div className="p-3.5 border-b border-stone-200 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-stone-500" />
                    <h4 className="font-bold text-xs text-stone-900 uppercase tracking-wider">
                      Itens para a Cozinha
                    </h4>
                  </div>
                  <span className="flex h-5 px-2 items-center justify-center rounded-full bg-stone-900 text-[10px] font-black text-white shadow-2xs">
                    {itensPdv.reduce((a, b) => a + b.quantidade, 0)}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
                  {itensPdv.length === 0 ? (
                    <div className="py-20 text-center text-xs text-stone-400 flex flex-col items-center justify-center">
                      <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-300 mb-2">
                        <Utensils className="h-5 w-5" />
                      </div>
                      <span>Toque nos produtos ao lado</span>
                      <span className="text-[10px] text-stone-400 mt-0.5">para adicionar à comanda</span>
                    </div>
                  ) : (
                    itensPdv.map((item) => (
                      <div
                        key={item.produto.id}
                        className="rounded-2xl border border-stone-200/90 bg-white p-3 text-xs space-y-2 shadow-2xs"
                      >
                        <div className="flex justify-between items-baseline font-bold text-stone-900">
                          <span className="truncate pr-2">{item.produto.nome}</span>
                          <span className="shrink-0 font-extrabold text-stone-900">
                            {formatarPreco(item.produto.preco_centavos * item.quantidade)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100">
                          <input
                            type="text"
                            placeholder="Obs.: sem cebola, ponto..."
                            value={item.observacao || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItensPdv((prev) =>
                                prev.map((i) =>
                                  i.produto.id === item.produto.id
                                    ? { ...i, observacao: val }
                                    : i
                                )
                              );
                            }}
                            className="text-[11px] border border-stone-200 rounded-lg px-2.5 py-1 flex-1 focus:bg-white bg-stone-50/70 focus:outline-hidden"
                          />

                          <div className="flex items-center gap-1.5 shrink-0 bg-stone-100 p-0.5 rounded-xl border border-stone-200/60">
                            <button
                              type="button"
                              onClick={() => alterarQtdPdv(item.produto.id, item.quantidade - 1)}
                              className="h-6 w-6 rounded-lg bg-white font-bold text-stone-700 shadow-2xs hover:bg-stone-50 active:scale-95 flex items-center justify-center text-xs"
                            >
                              -
                            </button>
                            <span className="font-black text-xs px-1.5 text-stone-900">
                              {item.quantidade}
                            </span>
                            <button
                              type="button"
                              onClick={() => alterarQtdPdv(item.produto.id, item.quantidade + 1)}
                              className="h-6 w-6 rounded-lg bg-white font-bold text-stone-700 shadow-2xs hover:bg-stone-50 active:scale-95 flex items-center justify-center text-xs"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Rodapé do PDV */}
                <div className="p-4 border-t border-stone-200 bg-white space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                      Total da Rodada:
                    </span>
                    <span className="text-lg font-black text-stone-900 tracking-tight">
                      {formatarPreco(
                        itensPdv.reduce((a, b) => a + b.produto.preco_centavos * b.quantidade, 0)
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={lidarComEnviarPedidoMesa}
                    disabled={itensPdv.length === 0}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white shadow-xs hover:opacity-95 disabled:opacity-40 transition-all active:scale-[0.98]"
                    style={{ backgroundColor: loja.cor_principal }}
                  >
                    <Utensils className="h-4 w-4" />
                    <span>Enviar para a Cozinha</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FECHAMENTO DE CONTA DA MESA */}
      {modalContaMesa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-titulo text-base font-bold text-stone-900">
                  Conta: {modalContaMesa.nome_identificador}
                </h3>
                {modalContaMesa.cliente_nome && (
                  <p className="text-xs text-stone-500">Cliente: {modalContaMesa.cliente_nome}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setModalContaMesa(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Extrato dos Itens */}
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 space-y-2 text-xs">
              <span className="font-bold text-[11px] text-stone-500 uppercase tracking-wider block">
                Itens Consumidos:
              </span>
              <div className="divide-y divide-stone-200/60 max-h-40 overflow-y-auto pr-1">
                {pedidos
                  .filter((p) => modalContaMesa.pedidos_ids.includes(p.id))
                  .flatMap((p) => p.itens || [])
                  .map((item, i) => (
                    <div key={i} className="flex justify-between py-1.5 text-stone-700">
                      <span>{item.quantidade}x {item.nome_produto}</span>
                      <span>{formatarPreco(item.preco_unitario_centavos * item.quantidade)}</span>
                    </div>
                  ))}
              </div>

              <div className="border-t border-stone-200 pt-2 space-y-1.5">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal:</span>
                  <span>{formatarPreco(modalContaMesa.total_centavos)}</span>
                </div>

                <label className="flex items-center justify-between cursor-pointer py-1">
                  <span className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={incluirServico10}
                      onChange={(e) => setIncluirServico10(e.target.checked)}
                      className="rounded border-stone-300"
                    />
                    <span>Taxa de serviço (10%):</span>
                  </span>
                  <span>{formatarPreco(Math.round(modalContaMesa.total_centavos * 0.1))}</span>
                </label>

                <div className="border-t border-stone-200 pt-1 flex justify-between font-bold text-base text-stone-900">
                  <span>Total da Conta:</span>
                  <span>
                    {formatarPreco(
                      modalContaMesa.total_centavos +
                        (incluirServico10 ? Math.round(modalContaMesa.total_centavos * 0.1) : 0)
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Calculadora de Divisão por Pessoas */}
            <div className="rounded-xl border border-stone-200 p-3 text-xs space-y-2">
              <span className="font-semibold text-stone-700 block">
                Dividir por quantas pessoas na mesa?
              </span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setDividirPessoas(num)}
                    className={`flex-1 py-1.5 rounded-lg font-bold border transition-colors ${
                      dividirPessoas === num
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    {num} {num === 1 ? 'pessoa' : 'pessoas'}
                  </button>
                ))}
              </div>

              {dividirPessoas > 1 && (
                <div className="rounded-lg bg-stone-100 p-2 text-center font-bold text-stone-800">
                  Fica{' '}
                  {formatarPreco(
                    Math.round(
                      (modalContaMesa.total_centavos +
                        (incluirServico10 ? Math.round(modalContaMesa.total_centavos * 0.1) : 0)) /
                        dividirPessoas
                    )
                  )}{' '}
                  para cada um.
                </div>
              )}
            </div>

            {/* Forma de Pagamento */}
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-stone-700 block">
                Como o cliente vai pagar?
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormaPagamento('pix')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    formaPagamento === 'pix'
                      ? 'border-sky-600 bg-sky-50 text-sky-900 ring-2 ring-sky-600/20'
                      : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <QrCode className="h-4 w-4 mb-1 text-sky-600" />
                  <span>Pix</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormaPagamento('cartao')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    formaPagamento === 'cartao'
                      ? 'border-violet-600 bg-violet-50 text-violet-900 ring-2 ring-violet-600/20'
                      : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <CreditCard className="h-4 w-4 mb-1 text-violet-600" />
                  <span>Cartão</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormaPagamento('dinheiro')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    formaPagamento === 'dinheiro'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/20'
                      : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <Banknote className="h-4 w-4 mb-1 text-emerald-600" />
                  <span>Dinheiro</span>
                </button>
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => imprimirExtrato(modalContaMesa)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors shadow-xs"
              >
                <Printer className="h-4 w-4 text-stone-500" />
                <span>Imprimir Extrato</span>
              </button>

              <button
                type="button"
                onClick={lidarComFecharConta}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 py-3 text-xs font-bold text-white shadow-xs hover:bg-stone-800 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Receber e Liberar Mesa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AJUSTAR QUANTIDADE DE MESAS */}
      {modalConfigMesas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-titulo text-sm font-bold text-stone-900">
                Configurar Mesas do Salão
              </h3>
              <button
                type="button"
                onClick={() => setModalConfigMesas(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={lidarComConfigurarMesas} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Quantas mesas seu restaurante possui? *
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  required
                  value={qtdMesasInput}
                  onChange={(e) => setQtdMesasInput(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs font-bold text-stone-900 focus:border-stone-800 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-stone-500">
                  O sistema criará automaticamente da Mesa 01 até a Mesa {qtdMesasInput}.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalConfigMesas(false)}
                  className="flex-1 rounded-xl border border-stone-200 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white shadow-xs hover:opacity-95"
                  style={{ backgroundColor: loja.cor_principal }}
                >
                  Salvar Mesas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QR CODES DAS MESAS */}
      {modalQrCodes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-titulo text-base font-bold text-stone-900">
                  QR Codes para Displays de Mesa
                </h3>
                <p className="text-xs text-stone-500">
                  Coloque no display da mesa para o cliente pedir direto pelo celular.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalQrCodes(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {mesas.map((mesa) => {
                const linkMesa = `${typeof window !== 'undefined' ? window.location.origin : 'kodfood.app'}/${loja.link}?mesa=${mesa.numero}`;
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(linkMesa)}`;

                return (
                  <div
                    key={mesa.id}
                    className="flex flex-col items-center justify-center rounded-xl border border-stone-200 p-3 text-center space-y-2 bg-stone-50"
                  >
                    <span className="font-bold text-xs text-stone-900">
                      {mesa.nome_identificador}
                    </span>

                    {/* QR Code gerado */}
                    <img
                      src={qrUrl}
                      alt={`QR Code ${mesa.nome_identificador}`}
                      className="h-28 w-28 rounded-lg border border-stone-200 bg-white p-1"
                    />

                    <span className="text-[10px] text-stone-400 truncate max-w-full">
                      ?mesa={mesa.numero}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
