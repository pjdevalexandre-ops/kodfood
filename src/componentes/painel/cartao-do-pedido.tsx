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
        return { proxima: 'confirmado', rotulo: 'Confirmar' };
      case 'confirmado':
        return { proxima: 'em_preparo', rotulo: 'Começar preparo' };
      case 'em_preparo':
        return pedido.tipo === 'entrega'
          ? { proxima: 'saiu_para_entrega', rotulo: 'Saiu para entrega' }
          : { proxima: 'pronto_para_retirada', rotulo: 'Pronto para retirar' };
      case 'pronto_para_retirada':
      case 'saiu_para_entrega':
        return { proxima: 'entregue', rotulo: 'Entregue / Concluir' };
      default:
        return null;
    }
  };

  const proximaEtapa = obterProximaEtapa();
  const ePedidoNovo = pedido.situacao === 'recebido';
  const eCancelado = pedido.situacao === 'cancelado';
  const eFinalizado = pedido.situacao === 'entregue' || eCancelado;

  return (
    <>
      <article
        className={`relative flex flex-col rounded-xl border bg-white p-4 transition-all shadow-xs ${
          ePedidoNovo
            ? 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-400/30'
            : eCancelado
            ? 'border-stone-200 bg-stone-50/70 opacity-60'
            : 'border-neutro-borda hover:border-stone-400'
        }`}
      >
        {/* Cabeçalho do Cartão: Número, tempo e tipo */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="font-titulo text-xl font-black text-neutro-texto">
              #{pedido.numero}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                pedido.tipo === 'entrega'
                  ? 'bg-blue-50 text-blue-800 border border-blue-200/60'
                  : pedido.tipo === 'mesa'
                  ? 'bg-violet-50 text-violet-800 border border-violet-200/60'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
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
                  <span>{pedido.comanda_identificador || 'Mesa'}</span>
                </>
              ) : (
                <>
                  <Store className="h-3 w-3" />
                  <span>Retirada</span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-neutro-secundario">
            <Clock className="h-3.5 w-3.5 text-stone-400" />
            <span className="font-medium">há {minutosDecorridos} min</span>
          </div>
        </div>

        {/* Cliente e Bairro */}
        <div className="mb-3">
          <div className="font-bold text-sm text-neutro-texto line-clamp-1">
            {pedido.nome_cliente}
          </div>
          <div className="text-xs text-neutro-secundario">
            {pedido.tipo === 'entrega'
              ? `Bairro: ${pedido.nome_do_bairro || 'Não informado'}`
              : pedido.tipo === 'mesa'
              ? `Consumo no Salão (${pedido.comanda_identificador || 'Mesa'})`
              : 'Retirada no balcão'}
          </div>
        </div>

        {/* Itens resumidos (2 primeiros itens) */}
        <div
          onClick={() => setModalDetalhesAberto(true)}
          className="cursor-pointer rounded-lg bg-stone-50 p-2.5 text-xs text-stone-700 mb-3 border border-stone-200/60 hover:bg-stone-100 transition-colors"
        >
          <div className="space-y-1">
            {pedido.itens?.slice(0, 3).map((item, i) => (
              <div key={i} className="flex justify-between items-start gap-1">
                <span className="font-medium line-clamp-1">
                  {item.quantidade}x {item.nome_produto}
                </span>
              </div>
            ))}
            {(pedido.itens?.length || 0) > 3 && (
              <span className="text-[11px] text-stone-500 font-medium block pt-0.5">
                + mais {(pedido.itens?.length || 0) - 3} itens...
              </span>
            )}
          </div>
        </div>

        {/* Total e Forma de Pagamento */}
        <div className="flex items-center justify-between border-t border-stone-100 pt-2.5 mb-3 text-xs">
          <span className="font-bold text-base text-neutro-texto">
            {formatarPreco(pedido.total_centavos)}
          </span>

          <span className="text-[11px] font-semibold text-stone-600 uppercase tracking-tight">
            {pedido.forma_pagamento === 'pix' && 'Pix'}
            {pedido.forma_pagamento === 'dinheiro' &&
              (pedido.troco_para_centavos
                ? `Dinheiro (Tr: ${formatarPreco(pedido.troco_para_centavos)})`
                : 'Dinheiro')}
            {pedido.forma_pagamento === 'cartao_na_entrega' && 'Cartão'}
          </span>
        </div>

        {/* Botões de Ação com um toque */}
        <div className="mt-auto flex items-center gap-2 pt-1">
          {proximaEtapa && !eFinalizado && (
            <button
              type="button"
              onClick={() => aoAvancarSituacao(pedido.id, proximaEtapa.proxima)}
              className="flex h-11 flex-1 items-center justify-center gap-1 rounded-lg px-3 text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-95 active:scale-95"
              style={{ backgroundColor: corLoja }}
            >
              <span>{proximaEtapa.rotulo}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => aoImprimir(pedido)}
            title="Imprimir comanda"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-neutro-borda bg-stone-50 text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <Printer className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setModalDetalhesAberto(true)}
            title="Ver detalhes completos"
            className="flex h-11 px-3 items-center justify-center rounded-lg border border-neutro-borda bg-stone-50 text-xs font-medium text-stone-700 hover:bg-stone-100 transition-colors"
          >
            Detalhes
          </button>
        </div>

        {/* Opção de cancelar */}
        {!eFinalizado && (
          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={() => setConfirmandoCancelamento(true)}
              className="text-[11px] text-stone-400 hover:text-red-700 transition-colors"
            >
              Cancelar pedido
            </button>
          </div>
        )}
      </article>

      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO */}
      {confirmandoCancelamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xs rounded-xl bg-white p-5 shadow-xl text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="font-titulo text-base font-bold text-neutro-texto">
              Cancelar Pedido #{pedido.numero}?
            </h3>
            <p className="mt-1 text-xs text-neutro-secundario leading-relaxed">
              Esta ação mudará a situação do pedido para cancelado no acompanhamento do cliente.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmandoCancelamento(false)}
                className="flex-1 rounded-lg border border-neutro-borda py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  aoCancelarPedido(pedido.id);
                  setConfirmandoCancelamento(false);
                }}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                Sim, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES COMPLETOS DO PEDIDO */}
      {modalDetalhesAberto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
          <div className="fixed inset-0" onClick={() => setModalDetalhesAberto(false)} />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom duration-150">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-neutro-borda p-4">
              <div>
                <h3 className="font-titulo text-lg font-bold text-neutro-texto">
                  Detalhes do Pedido #{pedido.numero}
                </h3>
                <span className="text-xs text-neutro-secundario">
                  Cliente: {pedido.nome_cliente} · {formatarTelefone(pedido.telefone_cliente)}
                </span>
              </div>
              <button
                onClick={() => setModalDetalhesAberto(false)}
                className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo rolável */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Itens */}
              <div>
                <h4 className="font-bold text-xs uppercase text-stone-400 tracking-wider mb-2">
                  Itens
                </h4>
                <div className="divide-y divide-stone-100 rounded-lg border border-stone-200/60 bg-stone-50 p-3">
                  {pedido.itens?.map((item, idx) => (
                    <div key={idx} className="py-2 first:pt-0 last:pb-0">
                      <div className="flex justify-between font-bold text-sm text-neutro-texto">
                        <span>
                          {item.quantidade}x {item.nome_produto}
                        </span>
                        <span>
                          {formatarPreco(item.preco_unitario_centavos * item.quantidade)}
                        </span>
                      </div>

                      {item.adicionais && item.adicionais.length > 0 && (
                        <div className="mt-1 space-y-0.5 pl-3 text-stone-600">
                          {item.adicionais.map((ad, i) => (
                            <div key={i} className="flex justify-between">
                              <span>+ {ad.nome_adicional}</span>
                              {ad.preco_centavos > 0 && (
                                <span>{formatarPreco(ad.preco_centavos)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {item.observacao && (
                        <p className="mt-1 rounded bg-amber-50 p-1.5 text-amber-900 border border-amber-200/60 font-medium">
                          Observação: {item.observacao}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Endereço */}
              <div>
                <h4 className="font-bold text-xs uppercase text-stone-400 tracking-wider mb-2">
                  Recebimento ({pedido.tipo === 'entrega' ? 'Entrega' : 'Retirada'})
                </h4>
                <div className="rounded-lg border border-stone-200/60 bg-stone-50 p-3 leading-relaxed text-stone-700">
                  {pedido.tipo === 'entrega' ? (
                    <>
                      <p className="font-bold text-neutro-texto">
                        {pedido.rua}, {pedido.numero_casa}
                        {pedido.complemento && ` - ${pedido.complemento}`}
                      </p>
                      <p>Bairro: {pedido.nome_do_bairro}</p>
                      {pedido.referencia && (
                        <p className="text-stone-500 mt-1">
                          Ponto de referência: {pedido.referencia}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="font-medium text-neutro-texto">
                      Retirada no balcão pelo próprio cliente.
                    </p>
                  )}
                </div>
              </div>

              {/* Pagamento e Valores */}
              <div>
                <h4 className="font-bold text-xs uppercase text-stone-400 tracking-wider mb-2">
                  Pagamento e Valores
                </h4>
                <div className="rounded-lg border border-stone-200/60 bg-stone-50 p-3 space-y-1.5">
                  <div className="flex justify-between text-stone-600">
                    <span>Forma de pagamento</span>
                    <span className="font-semibold text-neutro-texto capitalize">
                      {pedido.forma_pagamento.replace('_', ' ')}
                    </span>
                  </div>

                  {pedido.forma_pagamento === 'dinheiro' && pedido.troco_para_centavos && (
                    <div className="flex justify-between text-amber-900 font-semibold bg-amber-50 p-1.5 rounded">
                      <span>Troco para</span>
                      <span>{formatarPreco(pedido.troco_para_centavos)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-stone-600 pt-1 border-t border-stone-200/40">
                    <span>Subtotal</span>
                    <span>{formatarPreco(pedido.subtotal_centavos)}</span>
                  </div>

                  <div className="flex justify-between text-stone-600">
                    <span>Taxa de entrega</span>
                    <span>{formatarPreco(pedido.taxa_entrega_centavos)}</span>
                  </div>

                  <div className="flex justify-between font-bold text-sm text-neutro-texto pt-1 border-t border-stone-200/60">
                    <span>Total</span>
                    <span>{formatarPreco(pedido.total_centavos)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="border-t border-neutro-borda p-4 flex gap-2">
              <button
                type="button"
                onClick={() => aoImprimir(pedido)}
                className="flex-1 flex h-11 items-center justify-center gap-1.5 rounded-lg border border-neutro-borda bg-stone-50 text-xs font-semibold text-stone-700 hover:bg-stone-100"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir comanda</span>
              </button>

              <button
                type="button"
                onClick={() => setModalDetalhesAberto(false)}
                className="flex-1 flex h-11 items-center justify-center rounded-lg bg-stone-900 text-xs font-semibold text-white hover:opacity-90"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
