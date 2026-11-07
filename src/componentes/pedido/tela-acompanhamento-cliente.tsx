'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  MessageCircle,
  MapPin,
  Store,
  CreditCard,
  QrCode,
  Banknote,
  ArrowLeft,
  RefreshCw,
  Copy,
  Check,
  CheckCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { RespostaAcompanharPedido } from '@/tipos';
import { acompanharPedido } from '@/acesso-aos-dados';
import { formatarPreco } from '@/utilitarios/formatadores';
import { LinhaDoTempo } from './linha-do-tempo';

interface TelaAcompanhamentoClienteProps {
  codigoAcompanhamento: string;
}

export function TelaAcompanhamentoCliente({
  codigoAcompanhamento,
}: TelaAcompanhamentoClienteProps) {
  const [pedido, setPedido] = useState<RespostaAcompanharPedido | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [pixCopiado, setPixCopiado] = useState(false);

  const copiarPix = (codigo: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(codigo);
      setPixCopiado(true);
      setTimeout(() => setPixCopiado(false), 3000);
    }
  };

  const buscarDadosDoPedido = useCallback(
    async (isPolling = false) => {
      if (isPolling) {
        setAtualizando(true);
      }
      try {
        const dados = await acompanharPedido(codigoAcompanhamento);
        if (dados) {
          // Se o banco ainda não retornou o pix_copia_e_cola, recupera do cache temporário da sessão
          if (!dados.pix_copia_e_cola && typeof window !== 'undefined') {
            try {
              const guardado = sessionStorage.getItem('pix_temp_' + codigoAcompanhamento);
              if (guardado) {
                const parseGuardado = JSON.parse(guardado);
                if (parseGuardado.copiaECola) {
                  dados.pix_copia_e_cola = parseGuardado.copiaECola;
                  dados.pix_qr_code_base64 = parseGuardado.qrCodeBase64;
                  dados.pix_expira_em = parseGuardado.expiraEm;
                }
              }
            } catch {}
          }
          setPedido(dados);
        }
      } catch (erro) {
        console.error('Falha ao buscar acompanhamento do pedido', erro);
      } finally {
        setCarregando(false);
        setAtualizando(false);
      }
    },
    [codigoAcompanhamento]
  );

  // Busca imediata ao montar no navegador
  useEffect(() => {
    buscarDadosDoPedido(false);

    // Polling a cada 4 segundos para resposta rápida do cliente
    const intervalo = setInterval(() => {
      buscarDadosDoPedido(true);
    }, 4000);

    return () => clearInterval(intervalo);
  }, [buscarDadosDoPedido]);

  // Estado de Carregamento inicial (esqueleto)
  if (carregando) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-neutro-fundo p-4">
        <div className="h-6 w-24 animate-pulse rounded bg-stone-200 mb-4" />
        <div className="h-32 w-full animate-pulse rounded-xl bg-white mb-4" />
        <div className="h-44 w-full animate-pulse rounded-xl bg-white" />
      </div>
    );
  }

  // Se após buscar no localStorage não encontrar o pedido
  if (!pedido) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6 text-center">
        <div className="rounded-xl border border-neutro-borda bg-white p-8 shadow-sm">
          <h1 className="font-titulo text-xl font-bold text-neutro-texto">
            Não encontramos esse pedido
          </h1>
          <p className="mt-2 text-xs text-neutro-secundario leading-relaxed">
            Verifique se o link foi digitado corretamente ou entre em contato direto com a lanchonete.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-neutro-borda bg-stone-50 px-4 py-2.5 text-xs font-semibold text-neutro-texto hover:bg-stone-100"
            >
              Voltar ao início
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Gera texto diagramado completo do pedido para enviar no WhatsApp
  const itensTexto = (pedido.itens || [])
    .map((item) => {
      let linha = `• ${item.quantidade}x ${item.nome} (${formatarPreco(item.preco_unitario_centavos * item.quantidade)})`;
      if (item.adicionais && item.adicionais.length > 0) {
        const ads = item.adicionais.map((a) => a.nome).join(', ');
        linha += `\n   + Adicionais: ${ads}`;
      }
      if (item.observacao) {
        linha += `\n   Obs: "${item.observacao}"`;
      }
      return linha;
    })
    .join('\n');

  const tipoTexto =
    pedido.tipo === 'entrega' && pedido.endereco_entrega
      ? `🛵 *Entrega em:* ${pedido.endereco_entrega.rua || ''}, ${pedido.endereco_entrega.numero || ''}${
          pedido.endereco_entrega.complemento ? ' (' + pedido.endereco_entrega.complemento + ')' : ''
        }\n📍 *Bairro:* ${pedido.endereco_entrega.bairro || ''}${
          pedido.endereco_entrega.referencia ? '\n🔍 *Ref:* ' + pedido.endereco_entrega.referencia : ''
        }`
      : '🏬 *Retirada:* No balcão da loja';

  const pagamentoTexto =
    pedido.forma_pagamento === 'pix'
      ? 'Pix'
      : pedido.forma_pagamento === 'dinheiro'
      ? `Dinheiro${pedido.troco_para_centavos ? ' (Troco para ' + formatarPreco(pedido.troco_para_centavos) + ')' : ' (Sem troco)'}`
      : 'Cartão na entrega';

  const linkAcompanhamento = typeof window !== 'undefined' ? window.location.href : '';

  const nomeLoja = pedido.loja?.nome || 'Lanchonete';
  const textoWhatsAppCompleto = `Olá, *${nomeLoja}*! Acabei de fazer um pedido pelo cardápio digital:

📋 *PEDIDO #${pedido.numero}*
${tipoTexto}

🍔 *ITENS DO PEDIDO:*
${itensTexto}

💰 *TOTAL A PAGAR:*
Subtotal: ${formatarPreco(pedido.subtotal_centavos)}
${pedido.taxa_entrega_centavos > 0 ? `Taxa de entrega: ${formatarPreco(pedido.taxa_entrega_centavos)}\n` : ''}*Total: ${formatarPreco(pedido.total_centavos)}*
💳 *Pagamento:* ${pagamentoTexto}

🔗 *Acompanhe pelo link:*
${linkAcompanhamento}`;

  const linkWhatsApp = pedido.loja?.telefone_whatsapp
    ? `https://wa.me/55${pedido.loja.telefone_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(textoWhatsAppCompleto)}`
    : null;

  // Formatação de data/hora do pedido
  const dataFormatada = pedido.feito_em
    ? new Date(pedido.feito_em).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--:--';

  // Mapeamento da situação para texto humano
  const titulosSituacao: Record<string, string> = {
    aguardando_pix: 'Aguardando pagamento do Pix',
    recebido: 'Pedido recebido',
    confirmado: 'Confirmado',
    em_preparo: 'Estamos preparando',
    pronto_para_retirada: 'Pronto para retirar',
    saiu_para_entrega: 'Saiu para entrega',
    entregue: 'Entregue. Bom apetite!',
    cancelado: 'Pedido cancelado',
  };

  const [gerandoNovoPix, setGerandoNovoPix] = useState(false);

  const pixExpirado =
    !pedido.pix_pago &&
    !!pedido.pix_expira_em &&
    new Date(pedido.pix_expira_em).getTime() < Date.now();

  const gerarNovoPix = async () => {
    if (!pedido || gerandoNovoPix) return;
    setGerandoNovoPix(true);
    try {
      const res = await fetch('/api/pagamentos/gerar-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idPedido: pedido.id || codigoAcompanhamento,
          codigoAcompanhamento: codigoAcompanhamento,
          valorCentavos: pedido.total_centavos,
          lojaId: pedido.loja_id || pedido.loja?.link,
        }),
      });
      if (res.ok) {
        const novo = await res.json();
        setPedido((prev: any) =>
          prev
            ? {
                ...prev,
                pix_copia_e_cola: novo.copiaECola,
                pix_qr_code_base64: novo.qrCodeBase64,
                pix_expira_em: novo.expiraEm,
                pix_id_transacao: novo.idTransacao,
              }
            : prev
        );
      }
    } catch (e) {
      console.warn('Erro ao gerar novo Pix:', e);
    } finally {
      setGerandoNovoPix(false);
    }
  };

  // Se o pedido está aguardando Pix mas ainda não possui QR Code (ex: timeout inicial), gera automaticamente
  useEffect(() => {
    if (
      pedido &&
      pedido.forma_pagamento === 'pix' &&
      !pedido.pix_pago &&
      pedido.situacao === 'aguardando_pix' &&
      !pedido.pix_copia_e_cola &&
      !gerandoNovoPix
    ) {
      gerarNovoPix();
    }
  }, [pedido?.id, pedido?.pix_copia_e_cola, pedido?.situacao, gerandoNovoPix]);

  const eAguardandoPix =
    pedido.forma_pagamento === 'pix' &&
    !pedido.pix_pago &&
    pedido.situacao === 'aguardando_pix';

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-neutro-fundo text-neutro-texto antialiased p-4 pb-20">
      {/* Barra superior de navegação */}
      <header className="mb-4 flex items-center justify-between">
        <Link
          href={`/${pedido.loja?.link || ''}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Cardápio</span>
        </Link>

        {atualizando && (
          <span className="flex items-center gap-1 text-[11px] text-stone-400">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Atualizando...</span>
          </span>
        )}
      </header>

      <main className="space-y-4">
        {/* BLOCO PIX DINÂMICO MERCADO PAGO OU CHAVE MANUAL: AGUARDANDO PAGAMENTO OU APROVADO */}
        {eAguardandoPix ? (
          pixExpirado ? (
            <section className="rounded-2xl border-2 border-red-200 bg-red-50/70 p-5 space-y-3 text-center">
              <div className="flex items-center justify-center gap-2 text-red-900">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h2 className="font-titulo text-base font-bold">O código PIX expirou</h2>
              </div>
              <p className="text-xs text-red-800 leading-relaxed">
                O tempo para pagamento deste código se esgotou. Clique abaixo para gerar um novo código Pix atualizado.
              </p>
              <button
                type="button"
                onClick={gerarNovoPix}
                disabled={gerandoNovoPix}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-bold text-white transition-all bg-stone-900 hover:bg-stone-800 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${gerandoNovoPix ? 'animate-spin' : ''}`} />
                <span>{gerandoNovoPix ? 'Gerando novo código...' : 'Gerar novo PIX'}</span>
              </button>
            </section>
          ) : (
            <section className="rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-5 space-y-4 text-center">
              <div className="flex items-center justify-center gap-2 text-amber-900">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <h2 className="font-titulo text-base font-bold">Pague com Pix para liberar o pedido</h2>
              </div>

              <p className="text-xs text-amber-800 leading-relaxed">
                O seu pedido só começará a ser preparado após a confirmação do Pix no banco.
              </p>

              {/* Indicador de carregamento enquanto gera o Pix */}
              {gerandoNovoPix && !pedido.pix_copia_e_cola && (
                <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-amber-200 gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-amber-600" />
                  <span className="text-xs font-semibold text-stone-700">Gerando QR Code Pix do Mercado Pago...</span>
                </div>
              )}

              {/* Imagem do QR Code se disponível */}
              {pedido.pix_qr_code_base64 && (
                <div className="flex justify-center py-1">
                  <div className="p-3 bg-white rounded-2xl border border-amber-200 inline-block">
                    <img
                      src={`data:image/png;base64,${pedido.pix_qr_code_base64}`}
                      alt="QR Code Pix Mercado Pago"
                      className="h-44 w-44 object-contain mx-auto"
                    />
                    <span className="text-xs text-stone-400 block mt-1 font-semibold">
                      Aponte a câmera do banco
                    </span>
                  </div>
                </div>
              )}

              {/* Botão Copiar Código Copia e Cola */}
              {pedido.pix_copia_e_cola ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => copiarPix(pedido.pix_copia_e_cola || '')}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-bold transition-all ${
                      pixCopiado
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-900 text-white hover:bg-stone-800 active:scale-[0.99]'
                    }`}
                  >
                    {pixCopiado ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Código Pix Copiado com Sucesso!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copiar Código Pix (Copia e Cola)</span>
                      </>
                    )}
                  </button>
                  <span className="text-xs text-amber-700 block">
                    Cole no app do seu banco na opção <strong>Pix Copia e Cola</strong>.
                  </span>
                </div>
              ) : pedido.loja?.chave_pix ? (
                /* Modo PIX manual com chave da loja */
                <div className="rounded-xl border border-amber-200 bg-white p-3.5 space-y-2 text-left">
                  <span className="text-xs font-bold text-stone-700 block">Chave Pix da Loja:</span>
                  <div className="flex items-center justify-between gap-2 bg-stone-50 border border-stone-200 rounded-lg p-2">
                    <code className="text-xs font-mono font-bold text-stone-900 break-all select-all">
                      {pedido.loja.chave_pix}
                    </code>
                    <button
                      type="button"
                      onClick={() => copiarPix(pedido.loja.chave_pix || '')}
                      className="shrink-0 rounded bg-stone-200 hover:bg-stone-300 px-2.5 py-1 text-xs font-bold text-stone-800"
                    >
                      Copiar
                    </button>
                  </div>
                  {pedido.loja.nome_titular_pix && (
                    <p className="text-xs text-stone-600">
                      Titular: <strong>{pedido.loja.nome_titular_pix}</strong>
                    </p>
                  )}
                  <p className="text-xs font-semibold text-stone-800">
                    Valor exato a transferir: <strong>{formatarPreco(pedido.total_centavos)}</strong>
                  </p>
                </div>
              ) : null}

              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-center gap-1.5 text-xs text-amber-800 font-medium">
                <RefreshCw className="h-3 w-3 animate-spin text-amber-600" />
                <span>Identificando pagamento em tempo real...</span>
              </div>
            </section>
          )
        ) : pedido.pix_pago ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 text-xs font-semibold flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold block text-emerald-950">Pagamento Pix Aprovado!</span>
              <span>O restaurante já recebeu a confirmação do banco e está preparando seu pedido.</span>
            </div>
          </section>
        ) : null}

        {pedido.situacao === 'cancelado' && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 text-xs space-y-1">
            <span className="font-bold block text-red-950">Este pedido foi cancelado</span>
            <p className="leading-relaxed">
              {pedido.observacao?.includes('Cancelado:')
                ? pedido.observacao
                : 'O pedido foi cancelado pelo estabelecimento. Caso tenha dúvidas, entre em contato pelo WhatsApp.'}
            </p>
          </section>
        )}

        {/* Cartão principal de identificação e status */}
        <section className="rounded-xl border border-neutro-borda bg-white p-5 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-neutro-secundario">
                {pedido.loja?.nome || 'Lanchonete'}
              </span>
              <h1 className="font-titulo text-2xl font-bold tracking-tight text-neutro-texto">
                Pedido #{pedido.numero}
              </h1>
            </div>

            <span className="text-[11px] text-stone-400">
              Feito às {dataFormatada}
            </span>
          </div>

          <div className="mt-4 rounded-lg bg-stone-50 border border-stone-200/60 p-3">
            <span className="text-[11px] uppercase tracking-wider font-bold text-stone-400 block mb-0.5">
              Situação atual
            </span>
            <div className="text-base font-bold text-neutro-texto">
              {titulosSituacao[pedido.situacao] || pedido.situacao}
            </div>
          </div>

          {/* Linha do tempo das etapas */}
          <div className="mt-6 border-t border-stone-100 pt-5">
            <LinhaDoTempo
              situacao={pedido.situacao}
              tipo={pedido.tipo}
              corLoja={pedido.loja?.cor_principal || '#B4412B'}
            />
          </div>

          {/* Botão Enviar Pedido no WhatsApp da Loja */}
          {linkWhatsApp && (
            <div className="mt-6 border-t border-stone-100 pt-4 space-y-2">
              <a
                href={linkWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-xs font-bold text-white shadow-md hover:bg-[#20bd5a] active:scale-[0.99] transition-all"
              >
                <MessageCircle className="h-5 w-5 fill-white text-[#25D366]" />
                <span>Enviar este pedido no WhatsApp da Loja</span>
              </a>
              <p className="text-[11px] text-center text-stone-500">
                Toque no botão verde acima para enviar o comprovante e os itens direto no WhatsApp da lanchonete.
              </p>
            </div>
          )}
        </section>

        {/* Detalhes de entrega ou retirada */}
        <section className="rounded-xl border border-neutro-borda bg-white p-4 shadow-xs text-xs">
          <h2 className="font-titulo text-sm font-bold text-neutro-texto border-b border-stone-100 pb-2 mb-3">
            {pedido.tipo === 'entrega' ? 'Endereço de entrega' : 'Retirada no balcão'}
          </h2>

          {pedido.tipo === 'entrega' && pedido.endereco_entrega ? (
            <div className="flex items-start gap-2.5 text-stone-700 leading-relaxed">
              <MapPin className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-neutro-texto">
                  {pedido.endereco_entrega.rua}, {pedido.endereco_entrega.numero}
                  {pedido.endereco_entrega.complemento && ` - ${pedido.endereco_entrega.complemento}`}
                </p>
                <p className="text-stone-500">
                  Bairro: {pedido.endereco_entrega.bairro}
                </p>
                {pedido.endereco_entrega.referencia && (
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Ref.: {pedido.endereco_entrega.referencia}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 text-stone-700 leading-relaxed">
              <Store className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-neutro-texto">
                  {pedido.loja?.nome || 'Lanchonete'}
                </p>
                <p className="text-stone-500">
                  {pedido.loja?.endereco || 'Endereço informado pela lanchonete.'}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Forma de pagamento */}
        <section className="rounded-xl border border-neutro-borda bg-white p-4 shadow-xs text-xs">
          <h2 className="font-titulo text-sm font-bold text-neutro-texto border-b border-stone-100 pb-2 mb-3">
            Forma de pagamento
          </h2>

          <div className="flex items-center gap-2.5 text-stone-700">
            {pedido.forma_pagamento === 'pix' && (
              <>
                <QrCode className="h-4 w-4 text-emerald-700" />
                <span className="font-medium">Pix na entrega ou WhatsApp</span>
              </>
            )}

            {pedido.forma_pagamento === 'dinheiro' && (
              <>
                <Banknote className="h-4 w-4 text-emerald-800" />
                <span className="font-medium">
                  Dinheiro
                  {pedido.troco_para_centavos
                    ? ` (Troco para ${formatarPreco(pedido.troco_para_centavos)})`
                    : ' (Sem troco)'}
                </span>
              </>
            )}

            {pedido.forma_pagamento === 'cartao_na_entrega' && (
              <>
                <CreditCard className="h-4 w-4 text-stone-700" />
                <span className="font-medium">Cartão na entrega</span>
              </>
            )}
          </div>
        </section>

        {/* Resumo dos itens do pedido */}
        <section className="rounded-xl border border-neutro-borda bg-white p-4 shadow-xs text-xs">
          <h2 className="font-titulo text-sm font-bold text-neutro-texto border-b border-stone-100 pb-2 mb-3">
            Itens do pedido
          </h2>

          <div className="divide-y divide-stone-100">
            {(pedido.itens || []).map((item, idx) => (
              <div key={idx} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex justify-between font-semibold text-neutro-texto">
                  <span>
                    {item.quantidade}x {item.nome}
                  </span>
                  <span>{formatarPreco(item.preco_unitario_centavos * item.quantidade)}</span>
                </div>

                {item.adicionais && item.adicionais.length > 0 && (
                  <ul className="mt-0.5 space-y-0.5 pl-4 text-[11px] text-stone-500">
                    {item.adicionais.map((ad, i) => (
                      <li key={i}>
                        + {ad.nome}
                        {ad.preco_centavos > 0 && (
                          <span> ({formatarPreco(ad.preco_centavos)})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {item.observacao && (
                  <p className="mt-1 pl-4 text-[11px] italic text-stone-400">
                    &ldquo;{item.observacao}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-stone-100 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-neutro-secundario">
              <span>Subtotal</span>
              <span>{formatarPreco(pedido.subtotal_centavos)}</span>
            </div>

            <div className="flex justify-between text-neutro-secundario">
              <span>Taxa de entrega</span>
              <span>
                {pedido.tipo === 'entrega'
                  ? formatarPreco(pedido.taxa_entrega_centavos)
                  : 'Grátis (Retirada)'}
              </span>
            </div>

            <div className="border-t border-stone-100 pt-2 flex justify-between font-bold text-sm text-neutro-texto">
              <span>Total</span>
              <span>{formatarPreco(pedido.total_centavos)}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
