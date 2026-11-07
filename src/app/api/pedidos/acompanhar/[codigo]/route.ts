import { NextRequest, NextResponse } from 'next/server';
import { supabaseServidor } from '@/lib/supabase-servidor';
import { lerPedidosDoServidor } from '@/servicos/armazenamento-pedidos-servidor';
import { processarTransacaoPix } from '@/servicos/confirmacao-pagamento';
import { RespostaAcompanharPedido } from '@/tipos';

export const dynamic = 'force-dynamic';

function extrairMetaDescricao(descricao: string | null): Record<string, any> {
  if (!descricao) return {};
  const match = descricao.match(/<!--kodfood_meta:([\s\S]*?)-->/);
  if (!match) return {};
  try {
    return JSON.parse(match[1]);
  } catch {
    return {};
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { codigo: string } }
) {
  // 1. Tenta buscar no Supabase
  try {
    const { data, error } = await supabaseServidor
      .from('pedidos')
      .select(`
        *,
        lojas ( nome, link, telefone_whatsapp, cor_principal, endereco, descricao ),
        pedido_itens (
          id, nome_produto, quantidade, preco_unitario_centavos, observacao,
          pedido_item_adicionais ( id, nome_adicional, preco_centavos )
        )
      `)
      .eq('codigo_acompanhamento', params.codigo)
      .maybeSingle();

    if (error) {
      console.warn('[Acompanhar] Erro ao buscar pedido no Supabase:', error);
    }

    if (!error && data) {
      // Se for PIX, não estiver pago e estiver aguardando, confere diretamente no Mercado Pago
      if (
        data.forma_pagamento === 'pix' &&
        !data.pix_pago &&
        data.pix_id_transacao &&
        data.situacao === 'aguardando_pix'
      ) {
        let tokenLoja: string | null = null;
        if (data.lojas?.descricao) {
          const meta = extrairMetaDescricao(data.lojas.descricao);
          tokenLoja = meta.mercado_pago_access_token || null;
        }
        if (!tokenLoja && (data.lojas as any)?.mercado_pago_access_token) {
          tokenLoja = (data.lojas as any).mercado_pago_access_token;
        }

        try {
          const resVerificacao = await processarTransacaoPix(data.pix_id_transacao, tokenLoja, data);
          if (resVerificacao.pago) {
            data.pix_pago = true;
            data.situacao = 'recebido';
          }
        } catch (e) {
          console.warn('[Acompanhar] Falha na conferência de PIX ativo:', e);
        }
      }

      // Sanitiza referencia caso tenha JSON legado gravado por versões antigas
      let referenciaSanitizada = data.referencia;
      if (referenciaSanitizada && typeof referenciaSanitizada === 'string' && referenciaSanitizada.trim().startsWith('{')) {
        referenciaSanitizada = null;
      }

      const dadosLoja = (data.lojas as any) || {};
      const metaLoja = extrairMetaDescricao(dadosLoja.descricao);
      const chavePixLoja = dadosLoja.chave_pix || metaLoja.chave_pix || null;
      const titularPixLoja = dadosLoja.nome_titular_pix || metaLoja.nome_titular_pix || null;

      const formatado: RespostaAcompanharPedido = {
        id: data.id,
        loja_id: data.loja_id,
        numero: data.numero || 1,
        situacao: data.situacao || 'recebido',
        tipo: data.tipo || 'entrega',
        subtotal_centavos: data.subtotal_centavos || 0,
        taxa_entrega_centavos: data.taxa_entrega_centavos || 0,
        total_centavos: data.total_centavos || 0,
        forma_pagamento: data.forma_pagamento || 'pix',
        troco_para_centavos: data.troco_para_centavos || null,
        feito_em: data.feito_em || new Date().toISOString(),
        pix_copia_e_cola: data.pix_copia_e_cola || null,
        pix_qr_code_base64: data.pix_qr_code_base64 || null,
        pix_expira_em: data.pix_expira_em || null,
        pix_pago: Boolean(data.pix_pago),
        observacao: data.observacao || null,
        endereco_entrega: data.tipo === 'entrega' ? {
          bairro: data.nome_do_bairro || null,
          rua: data.rua || null,
          numero: data.numero_casa || null,
          complemento: data.complemento || null,
          referencia: referenciaSanitizada || null,
        } : null,
        loja: {
          nome: dadosLoja.nome || 'Lanchonete',
          link: dadosLoja.link || '',
          telefone_whatsapp: dadosLoja.telefone_whatsapp || null,
          cor_principal: dadosLoja.cor_principal || '#B4412B',
          endereco: dadosLoja.endereco || null,
          chave_pix: chavePixLoja,
          nome_titular_pix: titularPixLoja,
        },
        itens: (data.pedido_itens || []).map((it: any) => ({
          nome: it.nome_produto || it.nome || 'Item',
          quantidade: it.quantidade || 1,
          preco_unitario_centavos: it.preco_unitario_centavos || 0,
          observacao: it.observacao || null,
          adicionais: (it.pedido_item_adicionais || it.adicionais || []).map((ad: any) => ({
            nome: ad.nome_adicional || ad.nome || 'Adicional',
            preco_centavos: ad.preco_centavos || 0,
          })),
        })),
      };
      return NextResponse.json(formatado);
    }
  } catch (err) {
    console.warn('Erro ao consultar acompanhamento no Supabase via API:', err);
  }

  // 2. Fallback de servidor local
  const pedidos = lerPedidosDoServidor();
  const pedido = pedidos.find(
    (p: any) => p.codigo_acompanhamento === params.codigo || p.id === params.codigo
  );
  if (!pedido) {
    return NextResponse.json(null, { status: 404 });
  }

  let refLocal = pedido.referencia;
  if (refLocal && typeof refLocal === 'string' && refLocal.trim().startsWith('{')) {
    refLocal = null;
  }

  const respostaLocal: RespostaAcompanharPedido = {
    id: pedido.id,
    loja_id: pedido.loja_id,
    numero: pedido.numero || 1,
    situacao: pedido.situacao || 'recebido',
    tipo: pedido.tipo || 'entrega',
    subtotal_centavos: pedido.subtotal_centavos || 0,
    taxa_entrega_centavos: pedido.taxa_entrega_centavos || 0,
    total_centavos: pedido.total_centavos || 0,
    forma_pagamento: pedido.forma_pagamento || 'pix',
    troco_para_centavos: pedido.troco_para_centavos || null,
    feito_em: pedido.feito_em || new Date().toISOString(),
    pix_copia_e_cola: pedido.pix_copia_e_cola || null,
    pix_qr_code_base64: pedido.pix_qr_code_base64 || null,
    pix_expira_em: pedido.pix_expira_em || null,
    pix_pago: Boolean(pedido.pix_pago),
    observacao: pedido.observacao || null,
    endereco_entrega: pedido.tipo === 'entrega' ? {
      bairro: pedido.nome_do_bairro || null,
      rua: pedido.rua || null,
      numero: pedido.numero_casa || null,
      complemento: pedido.complemento || null,
      referencia: refLocal,
    } : null,
    loja: {
      nome: pedido.loja?.nome || 'Lanchonete',
      link: pedido.loja?.link || '',
      telefone_whatsapp: pedido.loja?.telefone_whatsapp || null,
      cor_principal: pedido.loja?.cor_principal || '#B4412B',
      endereco: pedido.loja?.endereco || null,
      chave_pix: pedido.loja?.chave_pix || null,
      nome_titular_pix: pedido.loja?.nome_titular_pix || null,
    },
    itens: (pedido.itens || []).map((it: any) => ({
      nome: it.nome_produto || it.nome || 'Item',
      quantidade: it.quantidade || 1,
      preco_unitario_centavos: it.preco_unitario_centavos || 0,
      observacao: it.observacao || null,
      adicionais: (it.adicionais || []).map((ad: any) => ({
        nome: ad.nome_adicional || ad.nome || 'Adicional',
        preco_centavos: ad.preco_centavos || 0,
      })),
    })),
  };

  return NextResponse.json(respostaLocal);
}
