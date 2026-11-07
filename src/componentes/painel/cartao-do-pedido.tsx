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
  Users,
  Eye,
  Phone,
  MapPin,
  CheckCircle,
} from 'lucide-react';
import { Pedido, SituacaoPedido } from '@/tipos';
import { formatarPreco, formatarTelefone } from '@/utilitarios/formatadores';
import { obterSituacaoDoPagamento } from '@/utilitarios/situacao-do-pagamento';

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
  const [motivoCancelamento, setMotivoCancelamento] = useState('Cliente solicitou o cancelamento');

  const situacaoPag = obterSituacaoDoPagamento(pedido);

  // Enviar resumo e GPS da entrega para o WhatsApp do Motoboy
  const enviarParaEntregador = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const itensTexto = (pedido.itens || [])
      .map((it) => `• ${it.quantidade}x ${it.nome_produto}`)
      .join('\n');

    let refLimpa = pedido.referencia;
    if (refLimpa && typeof refLimpa === 'string' && refLimpa.trim().startsWith('{')) {
      refLimpa = null;
    }

    const enderecoPartes = [
      pedido.rua ? `${pedido.rua}, nº ${pedido.numero_casa || 'S/N'}` : '',
      pedido.complemento ? `(${pedido.complemento})` : '',
      pedido.nome_do_bairro ? `- Bairro: ${pedido.nome_do_bairro}` : '',
    ].filter(Boolean).join(' ');

    const referenciaTexto = refLimpa ? `\n*Ponto de ref:* ${refLimpa}` : '';

    const enderecoParaMaps = encodeURIComponent(
      `${pedido.rua || ''}, ${pedido.numero_casa || ''}, ${pedido.nome_do_bairro || ''}`
    );
    const linkMaps = `https://www.google.com/maps/search/?api=1&query=${enderecoParaMaps}`;

    let pagamentoTexto = '';
    if (pedido.forma_pagamento === 'pix') {
      pagamentoTexto = situacaoPag.confirmado
        ? 'PIX já pago. Não cobrar nada do cliente.'
        : 'PIX AINDA NÃO CONFIRMADO. Não entregue sem falar com a loja.';
    } else if (pedido.forma_pagamento === 'dinheiro') {
      const troco = pedido.troco_para_centavos ? pedido.troco_para_centavos - pedido.total_centavos : 0;
      pagamentoTexto = `Cobrar ${formatarPreco(pedido.total_centavos)} em dinheiro.${troco > 0 ? ` Levar troco de ${formatarPreco(troco)}.` : ' Sem troco.'}`;
    } else {
      pagamentoTexto = `Cobrar ${formatarPreco(pedido.total_centavos)} no cartão. Levar a maquininha.`;
    }

    const textoCompleto = `🛵 *ENTREGA - PEDIDO #${pedido.numero}*\n\n` +
      `👤 *Cliente:* ${pedido.nome_cliente}\n` +
      `📱 *Telefone:* ${pedido.telefone_cliente || 'Não informado'}\n\n` +
      `📍 *Endereço:* ${enderecoPartes}${referenciaTexto}\n` +
      `🗺️ *Abrir rota no GPS:* ${linkMaps}\n\n` +
      `📦 *Itens do pedido:*\n${itensTexto}\n\n` +
      `💰 *Como receber:* ${pagamentoTexto}`;

    const linkWhatsapp = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoCompleto)}`;
    window.open(linkWhatsapp, '_blank');
  };

  // Tempo decorrido (em minutos)
  const minutosDecorridos = Math.max(
    0,
    Math.floor((Date.now() - new Date(pedido.feito_em).getTime()) / (1000 * 60))
  );

  // Rótulo de tempo sem a palavra "há"
  const rotuloTempo = minutosDecorridos === 0 ? 'Agora' : `${minutosDecorridos} min`;

  // Urgência do cronômetro
  const corDeUrgencia =
    minutosDecorridos < 15
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : minutosDecorridos <= 30
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-red-200 bg-red-50 text-red-700 animate-pulse motion-reduce:animate-none';

  // Próxima etapa
  const obterProximaEtapa = (): { proxima: SituacaoPedido; rotulo: string } | null => {
    switch (pedido.situacao) {
      case 'recebido':
        return { proxima: 'confirmado', rotulo: 'Aceitar pedido' };
      case 'confirmado':
      case 'em_preparo':
        if (pedido.tipo === 'entrega') {
          return { proxima: 'saiu_para_entrega', rotulo: 'Despachar' };
        }
        if (pedido.tipo === 'mesa') {
          return { proxima: 'entregue', rotulo: 'Servir' };
        }
        return { proxima: 'pronto_para_retirada', rotulo: 'Pronto para retirada' };
      case 'pronto_para_retirada':
      case 'saiu_para_entrega':
        return { proxima: 'entregue', rotulo: 'Concluir' };
      default:
        return null;
    }
  };

  const proximaEtapa = obterProximaEtapa();
  const eCancelado = pedido.situacao === 'cancelado';
  const eFinalizado = pedido.situacao === 'entregue' || eCancelado;
  const podeAvancar = Boolean(proximaEtapa && !eFinalizado);

  // Estilo e cor da faixa por situação
  let corDaFaixa = 'bg-stone-300';
  let estiloPorSituacao = 'bg-white';

  if (pedido.situacao === 'recebido') {
    corDaFaixa = 'bg-amber-500';
    estiloPorSituacao = 'bg-amber-50/60 ring-1 ring-amber-300';
  } else if (pedido.situacao === 'confirmado' || pedido.situacao === 'em_preparo') {
    corDaFaixa = 'bg-orange-500';
    estiloPorSituacao = 'bg-white';
  } else if (pedido.situacao === 'pronto_para_retirada' || pedido.situacao === 'saiu_para_entrega') {
    corDaFaixa = 'bg-blue-500';
    estiloPorSituacao = 'bg-white';
  } else if (pedido.situacao === 'entregue') {
    corDaFaixa = 'bg-emerald-600';
    estiloPorSituacao = 'bg-white';
  } else if (eCancelado) {
    corDaFaixa = 'bg-stone-300';
    estiloPorSituacao = 'bg-stone-50 opacity-60';
  }

  // Rótulo e ícone do tipo
  const rotuloDoTipo =
    pedido.tipo === 'entrega'
      ? 'Entrega'
      : pedido.tipo === 'mesa'
      ? pedido.comanda_identificador
        ? pedido.comanda_identificador.toLowerCase().startsWith('mesa')
          ? pedido.comanda_identificador
          : `Mesa ${pedido.comanda_identificador}`
        : 'Mesa'
      : 'Retirada no balcão';

  const IconeDoTipo = pedido.tipo === 'entrega' ? Bike : pedido.tipo === 'mesa' ? Users : Store;

  // Cor do tom do pagamento
  const corDoTom =
    situacaoPag.tom === 'confirmado'
      ? 'text-emerald-700'
      : situacaoPag.tom === 'pendente'
      ? 'text-amber-800'
      : situacaoPag.tom === 'alerta'
      ? 'text-red-700'
      : situacaoPag.tom === 'neutro'
      ? 'text-neutro-secundario'
      : 'text-neutro-texto';

  // Endereço limpo (sem json)
  let refLimpa = pedido.referencia;
  if (refLimpa && typeof refLimpa === 'string' && refLimpa.trim().startsWith('{')) {
    refLimpa = null;
  }

  const enderecoFormatado = pedido.rua
    ? `${pedido.rua}${pedido.numero_casa ? `, ${pedido.numero_casa}` : ''}${pedido.complemento ? ` (${pedido.complemento})` : ''}${pedido.nome_do_bairro ? ` - ${pedido.nome_do_bairro}` : ''}${refLimpa ? ` (${refLimpa})` : ''}`
    : pedido.nome_do_bairro
    ? `Bairro: ${pedido.nome_do_bairro}`
    : 'Endereço a combinar';

  const itens = pedido.itens || [];

  return (
    <>
      <article
        className={`relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-neutro-borda hover:shadow-md transition-shadow ${estiloPorSituacao}`}
      >
        {/* Faixa de situação reta recortada pelo overflow-hidden */}
        <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${corDaFaixa}`} />

        <div className="flex min-w-0 flex-1 flex-col p-3.5 pl-4">
          {/* 1. Cabeçalho: número à esquerda, tempo à direita, tipo embaixo */}
          <header className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-titulo text-xl font-bold leading-none text-neutro-texto">
                #{pedido.numero}
              </p>
              <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs font-semibold text-neutro-secundario">
                <IconeDoTipo className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{rotuloDoTipo}</span>
              </p>
            </div>
            <span
              className={`inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-2 text-xs font-semibold ${corDeUrgencia}`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>{rotuloTempo}</span>
            </span>
          </header>

          {/* 2. Cliente: nome numa linha, telefone na de baixo */}
          <div className="mt-3 min-w-0">
            <p className="truncate text-sm font-semibold text-neutro-texto">
              {pedido.nome_cliente}
            </p>
            {pedido.telefone_cliente && (
              <a
                href={`https://api.whatsapp.com/send?phone=55${pedido.telefone_cliente.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5 inline-flex items-center gap-1 text-xs text-neutro-secundario hover:text-neutro-texto"
              >
                <Phone className="h-3 w-3 shrink-0" />
                <span className="truncate">{formatarTelefone(pedido.telefone_cliente)}</span>
              </a>
            )}

            {/* Endereço em até 2 linhas (apenas entrega) */}
            {pedido.tipo === 'entrega' && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-snug text-neutro-secundario">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-2">{enderecoFormatado}</span>
              </p>
            )}
          </div>

          {/* 3. Observação do pedido se houver */}
          {pedido.observacao && (
            <div className="mt-2.5 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs font-medium text-amber-900 leading-snug">
              <span className="italic line-clamp-2">“{pedido.observacao}”</span>
            </div>
          )}

          {/* 4. Itens: lista simples com divisor */}
          <ul className="mt-3 space-y-2 border-t border-neutro-borda pt-3">
            {itens.slice(0, 3).map((item, index) => (
              <li key={item.id || index} className="min-w-0 text-sm">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="shrink-0 font-bold tabular-nums text-neutro-texto">
                    {item.quantidade}x
                  </span>
                  <span className="min-w-0 line-clamp-2 font-medium text-neutro-texto">
                    {item.nome_produto}
                  </span>
                </div>
                {item.observacao && (
                  <p className="mt-0.5 pl-6 text-xs italic text-amber-800 line-clamp-2">
                    {item.observacao}
                  </p>
                )}
              </li>
            ))}
            {itens.length > 3 && (
              <button
                type="button"
                onClick={() => setModalDetalhesAberto(true)}
                className="text-xs font-semibold text-neutro-secundario hover:text-neutro-texto underline pt-1 block"
              >
                + mais {itens.length - 3} itens no pedido...
              </button>
            )}
          </ul>

          {/* 5. Total e pagamento: texto alinhado, sem pílula */}
          <div className="mt-3 flex items-end justify-between gap-3 border-t border-neutro-borda pt-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutro-suave">Total</p>
              <p className="text-xl font-bold tabular-nums text-neutro-texto">
                {formatarPreco(pedido.total_centavos)}
              </p>
            </div>
            <div className="min-w-0 text-right">
              <p className="text-xs font-semibold text-neutro-suave">Pagamento</p>
              <p className={`text-sm font-semibold break-words flex items-center justify-end gap-1 ${corDoTom}`}>
                {situacaoPag.confirmado && <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                <span>{situacaoPag.rotulo}</span>
              </p>
              {situacaoPag.detalhe && (
                <p className="text-xs text-neutro-secundario">{situacaoPag.detalhe}</p>
              )}
            </div>
          </div>

          {/* 6. Ações */}
          <div className="mt-auto pt-3 space-y-2">
            {podeAvancar && proximaEtapa && (
              <button
                type="button"
                onClick={() => aoAvancarSituacao(pedido.id, proximaEtapa.proxima)}
                className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.99]"
                style={{ backgroundColor: corLoja }}
              >
                <span className="truncate">{proximaEtapa.rotulo}</span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </button>
            )}

            <div className={`grid gap-2 ${pedido.tipo === 'entrega' ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {pedido.tipo === 'entrega' && (
                <button
                  type="button"
                  onClick={enviarParaEntregador}
                  title="Enviar rota e dados para o motoboy no WhatsApp"
                  className="flex h-11 items-center justify-center gap-1.5 rounded-lg border border-neutro-borda bg-white px-2 text-xs font-semibold text-neutro-texto hover:bg-stone-50 active:scale-95"
                >
                  <Bike className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="truncate">Motoboy</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => aoImprimir(pedido)}
                title="Imprimir comanda térmica"
                className="flex h-11 items-center justify-center gap-1.5 rounded-lg border border-neutro-borda bg-white px-2 text-xs font-semibold text-neutro-texto hover:bg-stone-50 active:scale-95"
              >
                <Printer className="h-4 w-4 shrink-0 text-neutro-secundario" />
                <span className="truncate">Imprimir</span>
              </button>

              <button
                type="button"
                onClick={() => setModalDetalhesAberto(true)}
                title="Ver detalhes completos do pedido"
                className="flex h-11 items-center justify-center gap-1.5 rounded-lg border border-neutro-borda bg-white px-2 text-xs font-semibold text-neutro-texto hover:bg-stone-50 active:scale-95"
              >
                <Eye className="h-4 w-4 shrink-0 text-neutro-secundario" />
                <span className="truncate">Detalhes</span>
              </button>
            </div>

            {!eFinalizado && (
              <button
                type="button"
                onClick={() => setConfirmandoCancelamento(true)}
                className="mx-auto block h-9 px-2 text-xs font-medium text-neutro-suave underline underline-offset-2 hover:text-red-700"
              >
                Cancelar pedido
              </button>
            )}
          </div>
        </div>
      </article>

      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO COM MOTIVO */}
      {confirmandoCancelamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 border border-neutro-borda">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="font-titulo text-base font-bold text-neutro-texto text-center">
              Cancelar Pedido #{pedido.numero}?
            </h3>
            <p className="mt-1 text-xs text-neutro-secundario leading-relaxed text-center">
              O pedido será cancelado no acompanhamento do cliente e os itens voltarão ao estoque.
            </p>

            {/* Aviso fixo caso o pedido já tenha sido pago via Pix */}
            {pedido.pix_pago === true && (
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-950 text-left">
                <span className="font-bold block text-amber-900 mb-0.5">Aviso de Reembolso:</span>
                Este pedido já foi pago via PIX. Faça o reembolso no painel do Mercado Pago.
              </div>
            )}

            {/* Seleção do motivo */}
            <div className="mt-4 space-y-1.5 text-left">
              <label className="text-xs font-bold text-neutro-texto block">
                Motivo do cancelamento:
              </label>
              <select
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-neutro-borda bg-stone-50 text-xs text-neutro-texto focus:bg-white focus:border-stone-400 focus:outline-none"
              >
                <option value="Cliente solicitou o cancelamento">Cliente solicitou o cancelamento</option>
                <option value="Falta de ingrediente ou item no estoque">Falta de ingrediente ou item no estoque</option>
                <option value="Endereço fora da área de entrega">Endereço fora da área de entrega</option>
                <option value="Problema no pagamento">Problema no pagamento</option>
                <option value="Outro motivo operacional">Outro motivo operacional</option>
              </select>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmandoCancelamento(false)}
                className="flex-1 rounded-lg border border-neutro-borda py-2.5 text-xs font-semibold text-neutro-secundario hover:bg-stone-50 transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  aoCancelarPedido(pedido.id);
                  setConfirmandoCancelamento(false);
                }}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition-colors"
              >
                Confirmar cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COM DETALHES COMPLETOS DO PEDIDO */}
      {modalDetalhesAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 border border-neutro-borda max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <span className="font-titulo text-xl font-bold text-neutro-texto">
                  Pedido #{pedido.numero}
                </span>
                <p className="text-xs text-neutro-secundario">
                  Realizado em {new Date(pedido.feito_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalDetalhesAberto(false)}
                aria-label="Fechar"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-neutro-secundario hover:bg-stone-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Conteúdo rolável */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              {/* Cliente & Endereço */}
              <div className="rounded-xl border border-neutro-borda bg-stone-50/60 p-3.5 space-y-1.5">
                <div className="font-bold text-sm text-neutro-texto">{pedido.nome_cliente}</div>
                <div className="text-neutro-secundario">
                  Telefone: <strong>{formatarTelefone(pedido.telefone_cliente)}</strong>
                </div>
                {pedido.tipo === 'entrega' && (
                  <div className="text-neutro-secundario pt-1 border-t border-neutro-borda mt-2">
                    <div>
                      {pedido.rua}, {pedido.numero_casa}
                      {pedido.complemento && ` - ${pedido.complemento}`}
                    </div>
                    <div>Bairro: <strong>{pedido.nome_do_bairro}</strong></div>
                    {refLimpa && (
                      <div className="text-xs text-neutro-suave mt-0.5">
                        Ref: {refLimpa}
                      </div>
                    )}
                  </div>
                )}
                {pedido.tipo === 'mesa' && (
                  <div className="text-violet-800 font-semibold pt-1">
                    Atendimento no local - {rotuloDoTipo}
                  </div>
                )}
              </div>

              {/* Lista Completa dos Itens */}
              <div className="space-y-2">
                <span className="font-bold text-xs text-neutro-texto uppercase tracking-wider block">
                  Itens do Pedido ({pedido.itens?.length || 0})
                </span>
                <div className="space-y-2 divide-y divide-stone-100">
                  {pedido.itens?.map((item) => (
                    <div key={item.id} className="pt-2 first:pt-0">
                      <div className="flex justify-between items-start font-semibold text-neutro-texto">
                        <span>
                          {item.quantidade}x {item.nome_produto}
                        </span>
                        <span>{formatarPreco(item.preco_unitario_centavos * item.quantidade)}</span>
                      </div>
                      {item.adicionais && item.adicionais.length > 0 && (
                        <div className="ml-4 mt-1 space-y-0.5 text-xs text-neutro-secundario">
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
                        <div className="ml-4 mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800 font-medium">
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

              {/* Informações detalhadas de Pagamento */}
              <div className="rounded-xl border border-neutro-borda bg-stone-50/60 p-3 space-y-1.5">
                <span className="font-bold block text-neutro-texto uppercase tracking-wider mb-1">
                  Situação do Pagamento
                </span>
                <div className="flex justify-between">
                  <span className="text-neutro-secundario">Forma:</span>
                  <span className={`font-semibold ${corDoTom}`}>{situacaoPag.rotulo}</span>
                </div>
                {situacaoPag.detalhe && (
                  <div className="flex justify-between text-xs text-neutro-secundario">
                    <span>Detalhe:</span>
                    <span>{situacaoPag.detalhe}</span>
                  </div>
                )}
                {pedido.pix_id_transacao && (
                  <div className="flex justify-between text-xs text-neutro-suave pt-1 border-t border-stone-200/60">
                    <span>ID Transação Pix:</span>
                    <span className="font-mono">{pedido.pix_id_transacao}</span>
                  </div>
                )}
              </div>

              {/* Resumo Financeiro */}
              <div className="rounded-xl border border-neutro-borda bg-stone-50/60 p-3 space-y-1.5">
                <div className="flex justify-between text-neutro-secundario">
                  <span>Subtotal:</span>
                  <span>{formatarPreco(pedido.subtotal_centavos)}</span>
                </div>
                {pedido.tipo === 'entrega' && (
                  <div className="flex justify-between text-neutro-secundario">
                    <span>Taxa de Entrega:</span>
                    <span>{formatarPreco(pedido.taxa_entrega_centavos)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-neutro-texto pt-1.5 border-t border-neutro-borda">
                  <span>Total Geral:</span>
                  <span>{formatarPreco(pedido.total_centavos)}</span>
                </div>
              </div>
            </div>

            {/* Ações do Rodapé do Modal */}
            <div className="border-t border-stone-100 pt-4 flex flex-wrap gap-2">
              {pedido.tipo === 'entrega' && (
                <button
                  type="button"
                  onClick={enviarParaEntregador}
                  className="flex-1 flex h-11 items-center justify-center gap-1.5 rounded-lg border border-neutro-borda bg-stone-50 text-xs font-bold text-neutro-texto hover:bg-stone-100 transition-colors"
                >
                  <Bike className="h-4 w-4 text-emerald-600" />
                  <span>Mandar p/ Entregador</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  aoImprimir(pedido);
                  setModalDetalhesAberto(false);
                }}
                className="flex-1 flex h-11 items-center justify-center gap-1.5 rounded-lg border border-neutro-borda bg-white text-xs font-bold text-neutro-texto hover:bg-stone-50 transition-colors"
              >
                <Printer className="h-4 w-4 text-neutro-secundario" />
                <span>Imprimir Comanda</span>
              </button>

              {podeAvancar && proximaEtapa && (
                <button
                  type="button"
                  onClick={() => {
                    aoAvancarSituacao(pedido.id, proximaEtapa.proxima);
                    setModalDetalhesAberto(false);
                  }}
                  className="flex-1 flex h-11 items-center justify-center gap-1.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90"
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
