'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Banknote,
  QrCode,
  CreditCard,
  TrendingUp,
  PlusCircle,
  MinusCircle,
  Lock,
  Unlock,
  Printer,
  History,
  AlertCircle,
  CheckCircle2,
  X,
  Calendar,
} from 'lucide-react';
import { Loja, SessaoCaixa, MovimentoCaixa } from '@/tipos';
import {
  obterSessaoCaixaAtual,
  abrirCaixa,
  adicionarMovimentoCaixa,
  fecharCaixa,
  listarHistoricoCaixas,
  buscarLojaPeloLink,
} from '@/acesso-aos-dados';
import {
  formatarPreco,
  converterTextoMoedaParaCentavos,
  formatarMoedaDigitada,
  formatarDataHora,
} from '@/utilitarios/formatadores';
import { NavegacaoPainel } from './navegacao-painel';

interface TelaCaixaPainelProps {
  lojaInicial: Loja;
}

export function TelaCaixaPainel({ lojaInicial }: TelaCaixaPainelProps) {
  const [loja, setLoja] = useState<Loja>(lojaInicial);
  const [caixaAtual, setCaixaAtual] = useState<SessaoCaixa | null>(null);
  const [historico, setHistorico] = useState<SessaoCaixa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<'atual' | 'historico'>('atual');

  // Modais
  const [modalAbrirAberto, setModalAbrirAberto] = useState(false);
  const [modalMovimentoAberto, setModalMovimentoAberto] = useState<'suprimento' | 'sangria' | null>(null);
  const [modalFecharAberto, setModalFecharAberto] = useState(false);

  // Estados dos formulários dos modais
  const [valorTexto, setValorTexto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [saldoApuradoTexto, setSaldoApuradoTexto] = useState('');
  const [observacoesFechamento, setObservacoesFechamento] = useState('');
  const [erroModal, setErroModal] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Sessão para impressão de comprovante térmico de fechamento
  const [sessaoParaImprimir, setSessaoParaImprimir] = useState<SessaoCaixa | null>(null);

  const searchParams = useSearchParams();
  const slug = searchParams.get('loja') || lojaInicial.link;

  const recarregarDados = async (lojaId: string) => {
    try {
      const [atual, hist] = await Promise.all([
        obterSessaoCaixaAtual(lojaId),
        listarHistoricoCaixas(lojaId),
      ]);
      setCaixaAtual(atual);
      setHistorico(hist);
    } catch (e) {
      console.error('Erro ao carregar caixa', e);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (!slug) return;
    buscarLojaPeloLink(slug).then((l) => {
      if (l) {
        setLoja(l);
        recarregarDados(l.id);
      }
    });
  }, [slug]);

  // Abertura de Caixa
  const lidarComAbrirCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroModal('');
    setEnviando(true);

    try {
      const centavos = converterTextoMoedaParaCentavos(valorTexto);
      await abrirCaixa(loja.id, centavos);
      await recarregarDados(loja.id);
      setModalAbrirAberto(false);
      setValorTexto('');
    } catch (e: any) {
      setErroModal(e.message || 'Erro ao abrir caixa.');
    } finally {
      setEnviando(false);
    }
  };

  // Movimentação (Suprimento / Sangria)
  const lidarComMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalMovimentoAberto) return;
    setErroModal('');

    const centavos = converterTextoMoedaParaCentavos(valorTexto);
    if (centavos <= 0) {
      setErroModal('Informe um valor válido.');
      return;
    }

    if (!motivo.trim()) {
      setErroModal('Informe o motivo da movimentação.');
      return;
    }

    setEnviando(true);

    try {
      await adicionarMovimentoCaixa(loja.id, {
        tipo: modalMovimentoAberto,
        motivo: motivo.trim(),
        valor_centavos: centavos,
      });
      await recarregarDados(loja.id);
      setModalMovimentoAberto(null);
      setValorTexto('');
      setMotivo('');
    } catch (e: any) {
      setErroModal(e.message || 'Erro ao registrar movimentação.');
    } finally {
      setEnviando(false);
    }
  };

  // Fechamento de Caixa
  const lidarComFecharCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroModal('');
    setEnviando(true);

    try {
      const apuradoCentavos = converterTextoMoedaParaCentavos(saldoApuradoTexto);
      const fechada = await fecharCaixa(loja.id, apuradoCentavos, observacoesFechamento);
      await recarregarDados(loja.id);
      setModalFecharAberto(false);
      setSaldoApuradoTexto('');
      setObservacoesFechamento('');
      setSessaoParaImprimir(fechada);
    } catch (e: any) {
      setErroModal(e.message || 'Erro ao fechar caixa.');
    } finally {
      setEnviando(false);
    }
  };

  const imprimirFechamento = (sessao: SessaoCaixa) => {
    setSessaoParaImprimir(sessao);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const totalVendasDia = caixaAtual
    ? caixaAtual.total_vendas_dinheiro_centavos +
      caixaAtual.total_vendas_pix_centavos +
      caixaAtual.total_vendas_cartao_centavos
    : 0;

  return (
    <div className="min-h-screen bg-stone-100/70 text-neutro-texto antialiased pb-24 md:pb-12 md:pl-64 print:bg-white print:min-h-0 print:h-auto print:p-0 print:m-0">
      {/* Navegação Responsiva */}
      <div className="print:hidden">
        <NavegacaoPainel loja={loja} />
      </div>

      {/* COMPROVANTE TÉRMICO OCULTO NA TELA (IMPRIME EM 80MM) */}
      {sessaoParaImprimir && (
        <div className="hidden print:block font-mono text-[11px] leading-tight text-black max-w-[80mm] p-2 mx-auto">
          <div className="text-center pb-2 border-b border-black">
            <h1 className="font-bold text-sm uppercase">{loja.nome}</h1>
            <p className="text-[10px]">FECHAMENTO DE CAIXA</p>
            <p className="text-[10px]">
              Abertura: {formatarDataHora(sessaoParaImprimir.aberto_em)}
            </p>
            {sessaoParaImprimir.fechado_em && (
              <p className="text-[10px]">
                Fechamento: {formatarDataHora(sessaoParaImprimir.fechado_em)}
              </p>
            )}
          </div>

          <div className="py-2 border-b border-black space-y-1">
            <div className="flex justify-between">
              <span>Fundo de Troco:</span>
              <span>{formatarPreco(sessaoParaImprimir.saldo_inicial_centavos)}</span>
            </div>
            <div className="flex justify-between">
              <span>(+) Vendas Dinheiro:</span>
              <span>{formatarPreco(sessaoParaImprimir.total_vendas_dinheiro_centavos)}</span>
            </div>
            <div className="flex justify-between">
              <span>(+) Suprimentos:</span>
              <span>{formatarPreco(sessaoParaImprimir.total_suprimentos_centavos || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>(-) Sangrias:</span>
              <span>{formatarPreco(sessaoParaImprimir.total_sangrias_centavos || 0)}</span>
            </div>
            <div className="flex justify-between font-bold pt-1 border-t border-dashed border-black">
              <span>SALDO ESPERADO GAVETA:</span>
              <span>{formatarPreco(sessaoParaImprimir.saldo_esperado_dinheiro_centavos)}</span>
            </div>
            {sessaoParaImprimir.saldo_apurado_dinheiro_centavos !== null && (
              <div className="flex justify-between font-bold">
                <span>VALOR APURADO FÍSICO:</span>
                <span>{formatarPreco(sessaoParaImprimir.saldo_apurado_dinheiro_centavos)}</span>
              </div>
            )}
            {sessaoParaImprimir.diferenca_centavos !== null && (
              <div className="flex justify-between font-bold">
                <span>DIFERENÇA (SOBRA/FALTA):</span>
                <span>{formatarPreco(sessaoParaImprimir.diferenca_centavos)}</span>
              </div>
            )}
          </div>

          <div className="py-2 border-b border-black space-y-1">
            <p className="font-bold uppercase text-[10px]">Outras Formas:</p>
            <div className="flex justify-between">
              <span>Vendas Pix:</span>
              <span>{formatarPreco(sessaoParaImprimir.total_vendas_pix_centavos)}</span>
            </div>
            <div className="flex justify-between">
              <span>Vendas Cartão:</span>
              <span>{formatarPreco(sessaoParaImprimir.total_vendas_cartao_centavos)}</span>
            </div>
            <div className="flex justify-between font-bold pt-1 border-t border-dashed border-black text-xs">
              <span>FATURAMENTO TOTAL:</span>
              <span>
                {formatarPreco(
                  sessaoParaImprimir.total_vendas_dinheiro_centavos +
                    sessaoParaImprimir.total_vendas_pix_centavos +
                    sessaoParaImprimir.total_vendas_cartao_centavos
                )}
              </span>
            </div>
          </div>

          {sessaoParaImprimir.observacoes && (
            <div className="py-2 text-[10px]">
              <span className="font-bold">Observações: </span>
              <span>{sessaoParaImprimir.observacoes}</span>
            </div>
          )}

          <div className="text-center pt-4 text-[9px]">
            <p>KodFood · Fechamento Conferido</p>
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
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-titulo text-base font-bold text-neutro-texto">
                  Caixa do Dia
                </h1>
                {caixaAtual ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Aberto agora
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600 border border-stone-200">
                    <Lock className="h-2.5 w-2.5 text-stone-400" />
                    Fechado
                  </span>
                )}
              </div>
              <p className="text-xs text-neutro-secundario">
                {loja.nome} · Controle de troco, sangrias e faturamento
              </p>
            </div>
          </div>

          {/* Abas Caixa Atual vs Histórico */}
          <div className="flex items-center rounded-xl border border-stone-200 bg-stone-50 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAbaAtiva('atual')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                abaAtiva === 'atual'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Caixa Atual
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('historico')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                abaAtiva === 'historico'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Histórico ({historico.length})
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="w-full p-4 sm:px-8 space-y-6 print:hidden">
        {abaAtiva === 'atual' ? (
          <>
            {/* SE O CAIXA ESTIVER FECHADO */}
            {!caixaAtual ? (
              <div className="rounded-2xl border border-neutro-borda bg-white p-8 text-center shadow-xs max-w-md mx-auto my-8 space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-600">
                  <Lock className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="font-titulo text-lg font-bold text-neutro-texto">
                    O caixa está fechado
                  </h2>
                  <p className="mt-1 text-xs text-neutro-secundario">
                    Inicie o expediente registrando o fundo de troco em dinheiro na gaveta.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setValorTexto('100,00');
                    setModalAbrirAberto(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity"
                  style={{ backgroundColor: loja.cor_principal }}
                >
                  <Unlock className="h-4 w-4" />
                  <span>Abrir Caixa do Dia</span>
                </button>
              </div>
            ) : (
              /* SE O CAIXA ESTIVER ABERTO */
              <div className="space-y-6">
                {/* CARDS DE RESUMO DO CAIXA */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {/* 1. Dinheiro na Gaveta */}
                  <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-1">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="font-medium">Gaveta (Dinheiro)</span>
                      <Banknote className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="font-titulo text-xl sm:text-2xl font-bold text-stone-900">
                      {formatarPreco(caixaAtual.saldo_esperado_dinheiro_centavos)}
                    </div>
                    <p className="text-[11px] text-stone-400">
                      Troco: {formatarPreco(caixaAtual.saldo_inicial_centavos)}
                    </p>
                  </div>

                  {/* 2. Vendas em Pix */}
                  <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-1">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="font-medium">Vendas Pix</span>
                      <QrCode className="h-4 w-4 text-sky-600" />
                    </div>
                    <div className="font-titulo text-xl sm:text-2xl font-bold text-stone-900">
                      {formatarPreco(caixaAtual.total_vendas_pix_centavos)}
                    </div>
                    <p className="text-[11px] text-stone-400">Transferências diretas</p>
                  </div>

                  {/* 3. Vendas em Cartão */}
                  <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-1">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="font-medium">Vendas Cartão</span>
                      <CreditCard className="h-4 w-4 text-violet-600" />
                    </div>
                    <div className="font-titulo text-xl sm:text-2xl font-bold text-stone-900">
                      {formatarPreco(caixaAtual.total_vendas_cartao_centavos)}
                    </div>
                    <p className="text-[11px] text-stone-400">Maquininha na entrega</p>
                  </div>

                  {/* 4. Total Faturado */}
                  <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-1">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="font-medium">Faturamento Total</span>
                      <TrendingUp className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="font-titulo text-xl sm:text-2xl font-bold text-stone-900">
                      {formatarPreco(totalVendasDia)}
                    </div>
                    <p className="text-[11px] text-stone-400">Total apurado no dia</p>
                  </div>
                </div>

                {/* BOTÕES DE AÇÕES RÁPIDAS DO CAIXA */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setValorTexto('');
                      setMotivo('');
                      setModalMovimentoAberto('suprimento');
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs"
                  >
                    <PlusCircle className="h-4 w-4 text-emerald-600" />
                    <span>+ Suprimento (Entrada)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setValorTexto('');
                      setMotivo('');
                      setModalMovimentoAberto('sangria');
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-800 hover:bg-rose-100 transition-colors shadow-xs"
                  >
                    <MinusCircle className="h-4 w-4 text-rose-600" />
                    <span>- Sangria (Retirada)</span>
                  </button>

                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => imprimirFechamento(caixaAtual)}
                      className="hidden sm:flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-xs"
                    >
                      <Printer className="h-4 w-4 text-stone-500" />
                      <span>Imprimir Parcial</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSaldoApuradoTexto(
                          formatarMoedaDigitada(caixaAtual.saldo_esperado_dinheiro_centavos)
                        );
                        setObservacoesFechamento('');
                        setModalFecharAberto(true);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition-colors shadow-xs"
                    >
                      <Lock className="h-4 w-4" />
                      <span>Fechar Caixa</span>
                    </button>
                  </div>
                </div>

                {/* HISTÓRICO DE MOVIMENTAÇÕES NA SESSÃO ATUAL */}
                <section className="rounded-2xl border border-neutro-borda bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <h3 className="font-titulo text-sm font-bold text-neutro-texto">
                      Movimentações de Dinheiro da Sessão
                    </h3>
                    <span className="text-xs text-stone-400">
                      Aberta em {formatarDataHora(caixaAtual.aberto_em)}
                    </span>
                  </div>

                  {(!caixaAtual.movimentos || caixaAtual.movimentos.length === 0) ? (
                    <div className="py-8 text-center text-xs text-stone-400">
                      Nenhuma sangria ou suprimento registrado nesta sessão.
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-100 text-xs">
                      {caixaAtual.movimentos.map((mov) => (
                        <div
                          key={mov.id}
                          className="flex items-center justify-between py-2.5"
                        >
                          <div className="flex items-center gap-2.5">
                            {mov.tipo === 'suprimento' ? (
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                                <PlusCircle className="h-4 w-4" />
                              </span>
                            ) : (
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                                <MinusCircle className="h-4 w-4" />
                              </span>
                            )}
                            <div>
                              <p className="font-semibold text-stone-800 capitalize">
                                {mov.tipo}: {mov.motivo}
                              </p>
                              <span className="text-[11px] text-stone-400">
                                {formatarDataHora(mov.feito_em)}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`font-bold ${
                              mov.tipo === 'suprimento'
                                ? 'text-emerald-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {mov.tipo === 'suprimento' ? '+' : '-'} {formatarPreco(mov.valor_centavos)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </>
        ) : (
          /* ABA HISTÓRICO DE FECHAMENTOS */
          <div className="rounded-2xl border border-neutro-borda bg-white p-5 shadow-xs space-y-4">
            <h2 className="font-titulo text-sm font-bold text-neutro-texto border-b border-stone-100 pb-3">
              Histórico de Caixas Anteriores
            </h2>

            {historico.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-400">
                Nenhum fechamento registrado no histórico ainda.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {historico.map((sessao) => {
                  const total =
                    sessao.total_vendas_dinheiro_centavos +
                    sessao.total_vendas_pix_centavos +
                    sessao.total_vendas_cartao_centavos;

                  return (
                    <div
                      key={sessao.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900">
                            {formatarDataHora(sessao.aberto_em)}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              sessao.status === 'aberto'
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {sessao.status === 'aberto' ? 'Aberto' : 'Fechado'}
                          </span>
                        </div>

                        <p className="text-stone-500 text-[11px]">
                          Fundo: {formatarPreco(sessao.saldo_inicial_centavos)} · Dinheiro:{' '}
                          {formatarPreco(sessao.total_vendas_dinheiro_centavos)} · Pix:{' '}
                          {formatarPreco(sessao.total_vendas_pix_centavos)} · Cartão:{' '}
                          {formatarPreco(sessao.total_vendas_cartao_centavos)}
                        </p>

                        {sessao.observacoes && (
                          <p className="text-[11px] text-stone-400 italic">
                            Obs: {sessao.observacoes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-[11px] text-stone-400 block">Faturamento</span>
                          <span className="font-titulo text-sm font-bold text-stone-900">
                            {formatarPreco(total)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => imprimirFechamento(sessao)}
                          title="Imprimir relatório térmico 80mm"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 transition-colors"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL: ABRIR CAIXA */}
      {modalAbrirAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-titulo text-sm font-bold text-stone-900">
                Abrir Caixa do Dia
              </h3>
              <button
                type="button"
                onClick={() => setModalAbrirAberto(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {erroModal && (
              <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-800 font-medium">
                {erroModal}
              </div>
            )}

            <form onSubmit={lidarComAbrirCaixa} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Fundo de Troco Inicial (R$) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={valorTexto}
                  onChange={(e) => {
                    const centavos = converterTextoMoedaParaCentavos(e.target.value);
                    setValorTexto(formatarMoedaDigitada(centavos));
                  }}
                  placeholder="100,00"
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs font-bold text-stone-900 focus:border-stone-800 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-stone-500">
                  Valor em cédulas e moedas disponível na gaveta para iniciar as operações.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAbrirAberto(false)}
                  className="flex-1 rounded-xl border border-stone-200 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando}
                  className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white shadow-xs hover:opacity-95 disabled:opacity-50"
                  style={{ backgroundColor: loja.cor_principal }}
                >
                  {enviando ? 'Abrindo...' : 'Confirmar Abertura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MOVIMENTAÇÃO (SUPRIMENTO / SANGRIA) */}
      {modalMovimentoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-titulo text-sm font-bold text-stone-900 capitalize">
                {modalMovimentoAberto === 'suprimento' ? '+ Entrada de Troco (Suprimento)' : '- Retirada de Caixa (Sangria)'}
              </h3>
              <button
                type="button"
                onClick={() => setModalMovimentoAberto(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {erroModal && (
              <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-800 font-medium">
                {erroModal}
              </div>
            )}

            <form onSubmit={lidarComMovimentacao} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Valor (R$) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={valorTexto}
                  onChange={(e) => {
                    const centavos = converterTextoMoedaParaCentavos(e.target.value);
                    setValorTexto(formatarMoedaDigitada(centavos));
                  }}
                  placeholder="50,00"
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs font-bold text-stone-900 focus:border-stone-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Motivo *
                </label>
                <input
                  type="text"
                  required
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder={
                    modalMovimentoAberto === 'suprimento'
                      ? 'Ex.: Reforço de moedas'
                      : 'Ex.: Pagamento de fornecedor'
                  }
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:border-stone-800 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMovimentoAberto(null)}
                  className="flex-1 rounded-xl border border-stone-200 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando}
                  className={`flex-1 rounded-xl py-2.5 text-xs font-bold text-white shadow-xs hover:opacity-95 disabled:opacity-50 ${
                    modalMovimentoAberto === 'suprimento'
                      ? 'bg-emerald-700'
                      : 'bg-rose-700'
                  }`}
                >
                  {enviando ? 'Registrando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FECHAR CAIXA COM CONFERÊNCIA */}
      {modalFecharAberto && caixaAtual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-titulo text-sm font-bold text-stone-900">
                Fechamento de Caixa
              </h3>
              <button
                type="button"
                onClick={() => setModalFecharAberto(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {erroModal && (
              <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-800 font-medium">
                {erroModal}
              </div>
            )}

            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Fundo inicial:</span>
                <span>{formatarPreco(caixaAtual.saldo_inicial_centavos)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>(+) Vendas em dinheiro:</span>
                <span>{formatarPreco(caixaAtual.total_vendas_dinheiro_centavos)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>(+) Suprimentos:</span>
                <span>{formatarPreco(caixaAtual.total_suprimentos_centavos || 0)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>(-) Sangrias:</span>
                <span>{formatarPreco(caixaAtual.total_sangrias_centavos || 0)}</span>
              </div>
              <div className="border-t border-stone-200 pt-1.5 flex justify-between font-bold text-stone-900 text-sm">
                <span>Saldo esperado na gaveta:</span>
                <span>{formatarPreco(caixaAtual.saldo_esperado_dinheiro_centavos)}</span>
              </div>
            </div>

            <form onSubmit={lidarComFecharCaixa} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Valor contado fisicamente na gaveta (R$) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={saldoApuradoTexto}
                  onChange={(e) => {
                    const centavos = converterTextoMoedaParaCentavos(e.target.value);
                    setSaldoApuradoTexto(formatarMoedaDigitada(centavos));
                  }}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs font-bold text-stone-900 focus:border-stone-800 focus:outline-none"
                />

                {saldoApuradoTexto && (
                  <div className="mt-2 text-xs flex justify-between">
                    <span className="text-stone-500">Diferença (sobra/falta):</span>
                    {(() => {
                      const apurado = converterTextoMoedaParaCentavos(saldoApuradoTexto);
                      const dif = apurado - caixaAtual.saldo_esperado_dinheiro_centavos;
                      if (dif === 0) {
                        return <span className="font-bold text-emerald-600">Caixa exato (R$ 0,00)</span>;
                      }
                      if (dif > 0) {
                        return <span className="font-bold text-sky-600">Sobra de {formatarPreco(dif)}</span>;
                      }
                      return <span className="font-bold text-rose-600">Falta de {formatarPreco(Math.abs(dif))}</span>;
                    })()}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Observações de fechamento
                </label>
                <textarea
                  rows={2}
                  value={observacoesFechamento}
                  onChange={(e) => setObservacoesFechamento(e.target.value)}
                  placeholder="Ex.: Troco fechado corretamente pelo operador João."
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 focus:border-stone-800 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalFecharAberto(false)}
                  className="flex-1 rounded-xl border border-stone-200 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando}
                  className="flex-1 rounded-xl bg-stone-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-stone-800 disabled:opacity-50"
                >
                  {enviando ? 'Fechando...' : 'Confirmar e Fechar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
