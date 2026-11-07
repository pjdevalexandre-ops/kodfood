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
  Phone,
  MapPin,
  MessageSquare,
  FileText,
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
  const [motivoCancelamento, setMotivoCancelamento] = useState('Cliente solicitou o cancelamento');

  // Enviar resumo e GPS da entrega para o WhatsApp do Motoboy
  const enviarParaEntregador = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const itensTexto = (pedido.itens || [])
      .map((it) => `• ${it.quantidade}x ${it.nome_produto}`)
      .join('\n');

    const enderecoPartes = [
      pedido.rua ? `${pedido.rua}, nº ${pedido.numero_casa || 'S/N'}` : '',
      pedido.complemento ? `(${pedido.complemento})` : '',
      pedido.nome_do_bairro ? `- Bairro: ${pedido.nome_do_bairro}` : '',
    ].filter(Boolean).join(' ');

    const referenciaTexto = pedido.referencia ? `\n*Ponto de ref:* ${pedido.referencia}` : '';

    const enderecoParaMaps = encodeURIComponent(
      `${pedido.rua || ''}, ${pedido.numero_casa || ''}, ${pedido.nome_do_bairro || ''}`
    );
    const linkMaps = `https://www.google.com/maps/search/?api=1&query=${enderecoParaMaps}`;

    const pagamentoTexto =
      pedido.forma_pagamento === 'pix'
        ? '✅ PIX - JÁ PAGO ONLINE (Não precisa cobrar nada do cliente!)'
        : pedido.forma_pagamento === 'dinheiro'
        ? `💵 DINHEIRO - Cobrar ${formatarPreco(pedido.total_centavos)}${pedido.troco_para_centavos ? ` (Levar troco para ${formatarPreco(pedido.troco_para_centavos)})` : ''}`
        : `💳 CARTÃO NA ENTREGA - Cobrar ${formatarPreco(pedido.total_centavos)}`;

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

  // Calcula tempo desde que chegou
  const minutosDecorridos = Math.max(
    0,
    Math.floor((Date.now() - new Date(pedido.feito_em).getTime()) / (1000 * 60))
  );

  // Formata o cronômetro humanizado
  const rotuloTempo =
    minutosDecorridos === 0
      ? 'Agora mesmo'
      : `há ${minutosDecorridos} min`;

  // Cor por urgência: Verde (< 15 min), Amarelo (15 a 30 min), Vermelho (> 30 min)
  const corUrgenciaTempo = () => {
    if (minutosDecorridos < 15) {
      return 'bg-emerald-50 text-emerald-800 border border-emerald-200/80';
    }
    if (minutosDecorridos <= 30) {
      return 'bg-amber-50 text-amber-800 border border-amber-200/80';
    }
    return 'bg-red-50 text-red-700 border border-red-200 animate-pulse';
  };

  // Próxima etapa lógica e botão adaptativo conforme regras
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
  const ePedidoNovo = pedido.situacao === 'recebido';
  const eCancelado = pedido.situacao === 'cancelado';
  const eFinalizado = pedido.situacao === 'entregue' || eCancelado;

  // Cor lateral e estilo baseados no status
  const corBordaStatus = () => {
    if (eCancelado) return 'border-l-stone-300 bg-stone-50/70 opacity-60';
    if (ePedidoNovo) return 'border-l-amber-500 bg-gradient-to-b from-amber-50/40 via-white to-white shadow-sm ring-1 ring-amber-400/50';
    if (pedido.situacao === 'em_preparo' || pedido.situacao === 'confirmado') return 'border-l-orange-500 bg-white shadow-xs';
    if (pedido.situacao === 'pronto_para_retirada' || pedido.situacao === 'saiu_para_entrega') return 'border-l-blue-500 bg-white shadow-xs';
    return 'border-l-emerald-600 bg-white shadow-2xs';
  };

  return (
    <>
      <article
        className={`group relative flex flex-col rounded-2xl border-y border-r border-stone-200/90 border-l-[5px] p-4 transition-all duration-200 hover:shadow-md ${corBordaStatus()}`}
      >
        {/* Cabeçalho do Cartão: Número, Tipo e Cronômetro */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-titulo text-xl font-black tracking-tight text-stone-900 flex items-center gap-1.5">
              {ePedidoNovo && (
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping inline-block" />
              )}
              #{pedido.numero}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-2xs ${
                pedido.tipo === 'entrega'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : pedido.tipo === 'mesa'
                  ? 'bg-violet-50 text-violet-700 border border-violet-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {pedido.tipo === 'entrega' ? (
                <>
                  <Bike className="h-3.5 w-3.5" />
                  <span>Entrega</span>
                </>
              ) : pedido.tipo === 'mesa' ? (
                <>
                  <Users className="h-3.5 w-3.5" />
                  <span>{pedido.comanda_identificador ? (pedido.comanda_identificador.toLowerCase().startsWith('mesa') ? pedido.comanda_identificador : `Mesa ${pedido.comanda_identificador}`) : 'Mesa'}</span>
                </>
              ) : (
                <>
                  <Store className="h-3.5 w-3.5" />
                  <span>Balcão</span>
                </>
              )}
            </span>
          </div>

          {/* Cronômetro com cor por urgência */}
          <div
            className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-2xs ${corUrgenciaTempo()}`}
            title="Tempo decorrido desde a realização do pedido"
          >
            <Clock className="h-3 w-3 shrink-0" />
            <span>{rotuloTempo}</span>
          </div>
        </div>

        {/* Cliente, Telefone e Endereço */}
        <div className="mb-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-sm text-stone-900 truncate">
              {pedido.nome_cliente}
            </span>
            {pedido.telefone_cliente && (
              <a
                href={`https://api.whatsapp.com/send?phone=55${pedido.telefone_cliente.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 shrink-0 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg hover:bg-emerald-100 transition-colors shadow-2xs"
                title="Conversar no WhatsApp"
              >
                <Phone className="h-3 w-3 text-emerald-600" />
                <span>{formatarTelefone(pedido.telefone_cliente)}</span>
              </a>
            )}
          </div>

          {pedido.tipo === 'entrega' ? (
            <div className="text-xs text-stone-600 flex items-start gap-1.5 leading-snug">
              <MapPin className="h-3.5 w-3.5 text-stone-400 mt-0.5 shrink-0" />
              <span className="line-clamp-2">
                {pedido.rua ? (
                  <>
                    {pedido.rua}
                    {pedido.numero_casa ? `, ${pedido.numero_casa}` : ''}
                    {pedido.complemento ? ` (${pedido.complemento})` : ''}
                    {pedido.nome_do_bairro ? ` - ${pedido.nome_do_bairro}` : ''}
                  </>
                ) : (
                  pedido.nome_do_bairro ? `Bairro: ${pedido.nome_do_bairro}` : 'Endereço a combinar'
                )}
              </span>
            </div>
          ) : pedido.tipo === 'mesa' ? (
            <div className="text-xs text-stone-500 font-medium flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-stone-400" />
              <span>Consumo no salão</span>
            </div>
          ) : (
            <div className="text-xs text-stone-500 font-medium flex items-center gap-1">
              <Store className="h-3.5 w-3.5 text-stone-400" />
              <span>Retirada no balcão</span>
            </div>
          )}
        </div>

        {/* Observação com Destaque Visual se existir */}
        {pedido.observacao && (
          <div className="mb-3 flex items-start gap-1.5 rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-950 font-medium leading-snug shadow-2xs">
            <MessageSquare className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span className="line-clamp-2 italic">“{pedido.observacao}”</span>
          </div>
        )}

        {/* Itens resumidos (estilo comanda moderna) */}
        <div
          onClick={() => setModalDetalhesAberto(true)}
          className="cursor-pointer rounded-xl bg-stone-50/90 p-2.5 text-xs text-stone-700 mb-3 border border-stone-200/80 hover:bg-stone-100 hover:border-stone-300 transition-all shadow-2xs"
          title="Clique para ver todos os detalhes e opcionais"
        >
          <div className="space-y-1.5">
            {pedido.itens?.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-md bg-stone-900 text-white font-black text-[10px] shadow-2xs shrink-0">
                    {item.quantidade}x
                  </span>
                  <span className="font-semibold text-stone-900 truncate">
                    {item.nome_produto}
                  </span>
                </div>
                {item.observacao && (
                  <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-medium truncate max-w-[100px]">
                    {item.observacao}
                  </span>
                )}
              </div>
            ))}
            {(pedido.itens?.length || 0) > 3 && (
              <span className="text-[11px] text-stone-500 font-bold block pt-1 border-t border-stone-200/60">
                + mais {(pedido.itens?.length || 0) - 3} itens no pedido...
              </span>
            )}
          </div>
        </div>

        {/* Total e Forma de Pagamento com Status */}
        <div className="flex items-center justify-between border-t border-stone-100 pt-3 mb-3 text-xs">
          <div>
            <span className="text-[10px] text-stone-400 block uppercase font-bold tracking-wider">Total</span>
            <span className="font-black text-lg text-stone-900 tracking-tight">
              {formatarPreco(pedido.total_centavos)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-stone-400 block uppercase font-bold tracking-wider mb-0.5">Pagamento</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-stone-800 bg-stone-100 border border-stone-200/80 px-2.5 py-1 rounded-lg shadow-2xs">
              {pedido.forma_pagamento === 'pix' && 'PIX (pago)'}
              {pedido.forma_pagamento === 'dinheiro' &&
                (pedido.troco_para_centavos
                  ? `Dinheiro (Troco p/ ${formatarPreco(pedido.troco_para_centavos)})`
                  : 'Dinheiro')}
              {pedido.forma_pagamento === 'cartao_na_entrega' && 'Cartão na entrega'}
            </span>
          </div>
        </div>

        {/* Botões de Ação com visual moderno e limpo */}
        <div className="mt-auto flex items-center gap-2 pt-1">
          {proximaEtapa && !eFinalizado && (
            <button
              type="button"
              onClick={() => aoAvancarSituacao(pedido.id, proximaEtapa.proxima)}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-3.5 text-xs font-bold text-white shadow-xs transition-all hover:opacity-95 active:scale-[0.98] whitespace-nowrap"
              style={{ backgroundColor: corLoja }}
            >
              <span>{proximaEtapa.rotulo}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {pedido.tipo === 'entrega' && (
            <button
              type="button"
              onClick={enviarParaEntregador}
              title="Mandar rota e dados da entrega pro WhatsApp do entregador"
              aria-label="Mandar rota e dados da entrega pro WhatsApp do entregador"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 shadow-2xs hover:bg-emerald-100 hover:border-emerald-400 transition-colors active:scale-95"
            >
              <Bike className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => aoImprimir(pedido)}
            title="Imprimir comanda térmica"
            aria-label="Imprimir comanda térmica"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 shadow-2xs hover:bg-stone-50 hover:border-stone-300 transition-colors active:scale-95"
          >
            <Printer className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setModalDetalhesAberto(true)}
            title="Ver detalhes completos do pedido"
            aria-label="Ver detalhes completos do pedido"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 shadow-2xs hover:bg-stone-50 hover:border-stone-300 transition-colors active:scale-95"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>

        {/* Opção de cancelar com modal de motivo */}
        {!eFinalizado && (
          <div className="mt-2.5 text-center">
            <button
              type="button"
              onClick={() => setConfirmandoCancelamento(true)}
              className="text-[11px] font-semibold text-stone-400 hover:text-red-600 transition-colors underline decoration-dotted underline-offset-2"
            >
              Cancelar pedido
            </button>
          </div>
        )}
      </article>

      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO COM MOTIVO */}
      {confirmandoCancelamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-stone-200">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="font-titulo text-base font-bold text-stone-900 text-center">
              Cancelar Pedido #{pedido.numero}?
            </h3>
            <p className="mt-1 text-xs text-stone-500 leading-relaxed text-center">
              O pedido será cancelado no acompanhamento do cliente e os itens voltarão ao estoque.
            </p>

            {/* Seleção do motivo */}
            <div className="mt-4 space-y-1.5 text-left">
              <label className="text-[11px] font-bold text-stone-700 block">
                Motivo do cancelamento:
              </label>
              <select
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-800 focus:bg-white focus:border-stone-400 focus:outline-hidden"
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
                Confirmar cancelamento
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
            <div className="border-t border-stone-100 pt-4 flex flex-wrap gap-2">
              {pedido.tipo === 'entrega' && (
                <button
                  type="button"
                  onClick={enviarParaEntregador}
                  className="flex-1 flex h-11 items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                >
                  <Bike className="h-4 w-4" />
                  <span>Mandar p/ Entregador</span>
                </button>
              )}

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
