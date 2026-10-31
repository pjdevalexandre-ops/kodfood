import { NextRequest, NextResponse } from 'next/server';
import { criarCobrancaPixMercadoPago } from '@/servicos/mercado-pago';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/** Extrai metadados embutidos na coluna descricao */
function extrairMetaLojaDescricao(descricao: string | null): Record<string, any> {
  if (!descricao) return {};
  const match = descricao.match(/<!--kodfood_meta:([\s\S]*?)-->/);
  if (!match) return {};
  try {
    return JSON.parse(match[1]);
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idPedido, valorCentavos, nomeCliente, emailCliente, lojaId } = body;

    if (!idPedido || !valorCentavos || !lojaId) {
      return NextResponse.json(
        { erro: 'Parâmetros insuficientes para gerar cobrança PIX' },
        { status: 400 }
      );
    }

    // Busca dados da loja incluindo descricao para extrair metadados estendidos
    let tokenLoja: string | null = null;
    let lojaNome = 'KodFood Delivery';

    try {
      const { data: loja } = await supabase
        .from('lojas')
        .select('nome, descricao')
        .eq('id', lojaId)
        .maybeSingle();

      if (loja) {
        lojaNome = loja.nome || lojaNome;
        // Extrai token do Mercado Pago dos metadados embutidos na descricao
        const meta = extrairMetaLojaDescricao(loja.descricao);
        tokenLoja = meta.mercado_pago_access_token || null;
      }
    } catch {}

    // Fallback: usa o token do ambiente se a loja não tiver token próprio
    if (!tokenLoja) {
      tokenLoja = process.env.MERCADO_PAGO_ACCESS_TOKEN || null;
    }

    const resultadoPix = await criarCobrancaPixMercadoPago({
      valorCentavos,
      descricao: `Pedido no ${lojaNome}`,
      idPedido,
      nomeCliente: nomeCliente || 'Cliente',
      emailCliente,
      tokenLoja,
    });

    if (!resultadoPix) {
      return NextResponse.json(
        { erro: 'Não foi possível gerar cobrança PIX no gateway' },
        { status: 500 }
      );
    }

    // Atualiza o pedido com os dados do PIX (com fallback gracioso caso as colunas ainda não existam no Supabase)
    try {
      const agora = new Date().toISOString();
      const { error: errDed } = await supabase
        .from('pedidos')
        .update({
          situacao: 'recebido',
          pix_copia_e_cola: resultadoPix.copiaECola,
          pix_qr_code_base64: resultadoPix.qrCodeBase64,
          pix_expira_em: resultadoPix.expiraEm,
          pix_id_transacao: resultadoPix.idTransacao,
          atualizado_em: agora,
        })
        .eq('id', idPedido);

      if (errDed) {
        // Fallback: armazena os metadados do Pix de forma estruturada no campo referencia
        const metaPix = JSON.stringify({
          tipo: 'pix_mercado_pago',
          id_transacao: resultadoPix.idTransacao,
          copia_e_cola: resultadoPix.copiaECola,
          qr_code_base64: resultadoPix.qrCodeBase64,
          expira_em: resultadoPix.expiraEm,
          pago: false,
        });

        await supabase
          .from('pedidos')
          .update({
            referencia: metaPix,
            atualizado_em: agora,
          })
          .eq('id', idPedido);
      }
    } catch (err) {
      console.warn('Falha ao gravar dados do PIX no pedido:', err);
    }

    return NextResponse.json(resultadoPix);
  } catch (err) {
    console.error('Erro na rota gerar-pix:', err);
    return NextResponse.json({ erro: 'Erro interno ao gerar PIX' }, { status: 500 });
  }
}
