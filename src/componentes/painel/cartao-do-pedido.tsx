'use client';

import { useState } from 'react';
import {
  Bike,
  Store,
  Clock,
  Printer,
  ChevronRight,
  X,
  AlertTriangle,
  QrCode,
  Banknote,
  CreditCard,
  Users,
  Eye,
} from 'lucide-react';
import { Pedido, SituacaoPedido } from '@/tipos';
import { formatarPreco, formatarTelefone } from '@/utilitarios/formatadores';

interface CartaoDoPedidoProps {
  pedido: Pedido;
  corLoja: string;
  aoAvancarSituacao: (pedidoId: string, proximaSituacao: SituacaoPedido) => void;
  aoCancelarPedido: (pedidoId: string) => void;
  aoImprimir: (pedido: Pedido) => void;
}

export function CartaoDoPedido({
  pedido,
  corLoja,
  aoAvancarSituacao,
  aoCancelarPedido,
  aoImprimir,
}: CartaoDoPedidoProps) {
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);

  // Calcula tempo desde que chegou
  const minutosDecorridos = Math.max(
    0,
    Math.floor((Date.now() - new Date(pedido.feito_em).getTime()) / (1000 * 60))
  );

  // Próxima etapa lógica
  const obterProximaEtapa = (): { proxima: SituacaoPedido; rotulo: string } | null => {
    switch (pedido.situacao) {
      case 'recebido':
        return { proxima: 'confirmado', rotulo: 'Aceitar' };
      case 'confirmado':
        return { proxima: 'em_preparo', rotulo: 'Preparar' };
      case 'em_preparo':
        return pedido.tipo === 'entrega'
          ? { proxima: 'saiu_para_entrega', rotulo: 'Despachar' }
          : { proxima: 'pronto_para_retirada', rotulo: 'Pronto' };
      case 'pronto_para_retirada':
      case 'saiu_para_entrega':
        return { proxima: 'entregue', rotulo: 'Concluir' };
      default:
        return null;
    }
  };

  const proximaEtapa = obterProximaEtapa();
  const ePedidoNovo = pedido.situacao === 'recebido';
  const eCancelado = pedido.situacao === 'cancelado';
  const eFinalizado = pedido.situacao === 'entregue' || eCancelado;

  // Cor lateral baseada no status
  const corBordaStatus = () => {
    if (eCancelado) return 'border-l-stone-400 bg-stone-50/70 opacity-60';
    if (ePedidoNovo) return 'border-l-amber-500 bg-white shadow-md ring-1 ring-amber-400/40 animate-pulse-subtle';
    if (pedido.situacao === 'em_preparo' || pedido.situacao === 'confirmado') return 'border-l-orange-500 bg-white shadow-sm';
    if (pedido.situacao === 'pronto_para_retirada' || pedido.situacao === 'saiu_para_entrega') return 'border-l-blue-500 bg-white shadow-sm';
    return 'border-l-emerald-600 bg-white/90 shadow-2xs';
  };

  return (
    <>
      <article
        className={`group relative flex flex-col rounded-2xl border-y border-r border-stone-200/90 border-l-[5px] p-4 transition-all duration-200 hover:shadow-md ${corBordaStatus()}`}
      >
        {/* Cabeçalho do Cartão: Número, tempo e tipo */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-titulo text-xl font-extrabold tracking-tight text-stone-900">
              #{pedido.numero}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                pedido.tipo === 'entrega'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : pedido.tipo === 'mesa'
                  ? 'bg-violet-50 text-violet-700 border border-violet-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {pedido.tipo === 'entrega' ? (
                <>
                  <Bike className="h-3 w-3" />
                  <span>Entrega</span>
                </>
              ) : pedido.tipo === 'mesa' ? (
                <>
                  <Users className="h-3 w-3" />
                  <span>{pedido.comanda_identificador ? (pedido.comanda_identificador.toLowerCase().startsWith('mesa') ? pedido.comanda_identificador : `Mesa ${pedido.comanda_identificador}`) : 'Mesa'}</span>
                </>
              ) : (
                <>
                  <Store className="h-3 w-3" />
                  <span>Balcão</span>
                </>
              )}
            </span>
          </div>

          <div
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${
              minutosDecorridos > 30
                ? 'bg-red-50 text-red-600'
                : 'text-stone-500'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{minutosDecorridos}m</span>
          </div>
        </div>

        {/* Cliente e Bairro */}
        <div className="mb-3">
          <div className="font-bold text-sm text-stone-900 line-clamp-1">
            {pedido.nome_cliente}
          </div>
          <div className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
            {pedido.tipo === 'entrega' ? (
              <span>Bairro: <strong className="text-stone-700">{pedido.nome_do_bairro || 'Centro'}</strong></span>
            ) : pedido.tipo === 'mesa' ? (
              <span>Atendimento no local</span>
            ) : (
              <span>Retirada no balcão</span>
            )}
          </div>
        </div>

        {/* Itens resumidos (clicáveis para abrir detalhes) */}
        <div
          onClick={() => setModalDetalhesAberto(true)}
          className="cursor-pointer rounded-xl bg-stone-50/80 p-2.5 text-xs text-stone-700 mb-3 border border-stone-200/60 hover:bg-stone-100 hover:border-stone-300 transition-colors"
        >
          <div className="space-y-1">
            {pedido.itens?.slice(0, 3).map((item, i) => (
              <div key={i} className="flex justify-between items-start gap-1">
                <span className="font-medium line-clamp-1">
                  <strong className="text-stone-900">{item.quantidade}x</strong> {item.nome_produto}
                </span>
              </div>
            ))}
            {(pedido.itens?.length || 0) > 3 && (
              <span className="text-[11px] text-stone-500 font-semibold block pt-0.5">
                + mais {(pedido.itens?.length || 0) - 3} itens...
              </span>
            )}
          </div>
        </div>

        {/* Total e Forma de Pagamento */}
        <div className="flex items-center justify-between border-t border-stone-100 pt-2.5 mb-3.5 text-xs">
          <div>
            <span className="text-[10px] text-stone-400 block uppercase font-bold">Total</span>
            <span className="font-extrabold text-base text-stone-900">
              {formatarPreco(pedido.total_centavos)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-stone-400 block uppercase font-bold">Pagamento</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md">
              {pedido.forma_pagamento === 'pix' && 'PIX'}
              {pedido.forma_pagamento === 'dinheiro' &&
                (pedido.troco_para_centavos
                  ? `Dinheiro (Tr: ${formatarPreco(pedido.troco_para_centavos)})`
                  : 'Dinheiro')}
              {pedido.forma_pagamento === 'cartao_na_entrega' && 'Cartão'}
            </span>
          </div>
        </div>

        {/* Botões de Ação com visual moderno e limpo */}
        <div className="mt-auto flex items-center gap-1.5 pt-1">
          {proximaEtapa && !eFinalizado && (
            <button
              type="button"
              onClick={() => aoAvancarSituacao(pedido.id, proximaEtapa.proxima)}
              className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl px-2.5 text-xs font-bold text-white shadow-2xs transition-all hover:opacity-95 active:scale-[0.98] whitespace-nowrap"
              style={{ backgroundColor: corLoja }}
            >
              <span>{proximaEtapa.rotulo}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => aoImprimir(pedido)}
            title="Imprimir comanda"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 shadow-2xs hover:bg-stone-50 hover:border-stone-300 transition-colors"
          >
            <Printer className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setModalDetalhesAberto(true)}
            title="Ver detalhes do pedido"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 shadow-2xs hover:bg-stone-50 hover:border-stone-300 transition-colors"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>

        {/* Opção de cancelar */}
        {!eFinalizado && (
          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={() => setConfirmandoCancelamento(true)}
              className="text-[11px] font-medium text-stone-400 hover:text-red-600 transition-colors"
            >
              Cancelar pedido
            </button>
          </div>
        )}
      </article>

      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO */}
      {confirmandoCancelamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-2xl text-center border border-stone-200">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="font-titulo text-base font-bold text-stone-900">
              Cancelar Pedido #{pedido.numero}?
            </h3>
            <p className="mt-1 text-xs text-stone-500 leading-relaxed">
              O pedido será cancelado no acompanhamento do cliente e os itens voltarão ao estoque.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmandoCancelamento(false)}
                className="flex-1 rounded-xl border border-stone-200 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  aoCancelarPedido(pedido.id);
                  setConfirmandoCancelamento(false);
                }}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition-colors shadow-xs"
              >
                Sim, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COM DETALHES COMPLETOS DO PEDIDO */}
      {modalDetalhesAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <span className="font-titulo text-xl font-extrabold text-stone-900">
                  Pedido #{pedido.numero}
                </span>
                <p className="text-xs text-stone-500">
                  Realizado em {new Date(pedido.feito_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalDetalhesAberto(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Conteúdo rolável */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              {/* Cliente & Endereço */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3.5 space-y-1.5">
                <div className="font-bold text-sm text-stone-900">{pedido.nome_cliente}</div>
                <div className="text-stone-600">
                  Telefone: <strong>{formatarTelefone(pedido.telefone_cliente)}</strong>
                </div>
                {pedido.tipo === 'entrega' && (
                  <div className="text-stone-600 pt-1 border-t border-stone-200/60 mt-2">
                    <div>
                      {pedido.rua}, {pedido.numero_casa}
                      {pedido.complemento && ` - ${pedido.complemento}`}
                    </div>
                    <div>Bairro: <strong>{pedido.nome_do_bairro}</strong></div>
                    {pedido.referencia && (
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Ref: {pedido.referencia}
                      </div>
                    )}
                  </div>
                )}
                {pedido.tipo === 'mesa' && (
                  <div className="text-violet-800 font-semibold pt-1">
                    Atendimento no local - Mesa {pedido.comanda_identificador}
                  </div>
                )}
              </div>

              {/* Lista Completa dos Itens */}
              <div className="space-y-2">
                <span className="font-bold text-xs text-stone-700 uppercase tracking-wider block">
                  Itens do Pedido ({pedido.itens?.length || 0})
                </span>
                <div className="space-y-2 divide-y divide-stone-100">
                  {pedido.itens?.map((item) => (
                    <div key={item.id} className="pt-2 first:pt-0">
                      <div className="flex justify-between items-start font-semibold text-stone-900">
                        <span>
                          {item.quantidade}x {item.nome_produto}
                        </span>
                        <span>{formatarPreco(item.preco_unitario_centavos * item.quantidade)}</span>
                      </div>
                      {item.adicionais && item.adicionais.length > 0 && (
                        <div className="ml-4 mt-1 space-y-0.5 text-[11px] text-stone-500">
                          {item.adicionais.map((add) => (
                            <div key={add.id} className="flex justify-between">
                              <span>+ {add.nome_adicional}</span>
                              {add.preco_centavos > 0 && (
                                <span>{formatarPreco(add.preco_centavos * item.quantidade)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {item.observacao && (
                        <div className="ml-4 mt-1 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-800 font-medium">
                          Obs: {item.observacao}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Observação Geral */}
              {pedido.observacao && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-amber-900">
                  <span className="font-bold block mb-0.5">Observação do Cliente:</span>
                  <span>{pedido.observacao}</span>
                </div>
              )}

              {/* Resumo Financeiro */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 space-y-1.5">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal:</span>
                  <span>{formatarPreco(pedido.subtotal_centavos)}</span>
                </div>
                {pedido.tipo === 'entrega' && (
                  <div className="flex justify-between text-stone-600">
                    <span>Taxa de Entrega:</span>
                    <span>{formatarPreco(pedido.taxa_entrega_centavos)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-stone-900 pt-1.5 border-t border-stone-200">
                  <span>Total Geral:</span>
                  <span>{formatarPreco(pedido.total_centavos)}</span>
                </div>
              </div>
            </div>

            {/* Ações do Rodapé do Modal */}
            <div className="border-t border-stone-100 pt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  aoImprimir(pedido);
                  setModalDetalhesAberto(false);
                }}
                className="flex-1 flex h-11 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-800 hover:bg-stone-50 transition-colors shadow-2xs"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir Comanda</span>
              </button>

              {proximaEtapa && !eFinalizado && (
                <button
                  type="button"
                  onClick={() => {
                    aoAvancarSituacao(pedido.id, proximaEtapa.proxima);
                    setModalDetalhesAberto(false);
                  }}
                  className="flex-1 flex h-11 items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90"
                  style={{ backgroundColor: corLoja }}
                >
                  <span>{proximaEtapa.rotulo}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
