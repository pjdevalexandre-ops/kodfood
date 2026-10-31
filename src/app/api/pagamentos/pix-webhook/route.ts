import { NextRequest, NextResponse } from 'next/server';
import { consultarCobrancaPixMercadoPago } from '@/servicos/mercado-pago';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/** Extrai metadados embutidos na coluna descricao */
function extrairMetaDescricao(descricao: string | null): Record<string, any> {
  if (!descricao) return {};
  const match = descricao.match(/<!--kodfood_meta:([\s\S]*?)-->/);
  if (!match) return {};
  try { return JSON.parse(match[1]); } catch { return {}; }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    let idTransacao =
      searchParams.get('id') ||
      searchParams.get('data.id') ||
      searchParams.get('resource');

    let body: any = null;
    try {
      body = await req.json();
    } catch {}

    if (!idTransacao && body?.data?.id) {
      idTransacao = String(body.data.id);
    }

    if (!idTransacao && body?.id) {
      idTransacao = String(body.id);
    }

    if (!idTransacao) {
      return NextResponse.json({ mensagem: 'ID de pagamento ausente' }, { status: 200 });
    }

    // Tenta encontrar o pedido para obter o token da loja
    let tokenDaLoja: string | null = null;
    try {
      const { data: pedidoRef } = await supabase
        .from('pedidos')
        .select('id, loja_id, pix_id_transacao, referencia')
        .or(`pix_id_transacao.eq.${idTransacao},referencia.like.%${idTransacao}%`)
        .maybeSingle();

      if (pedidoRef?.loja_id) {
        const { data: loja } = await supabase
          .from('lojas')
          .select('descricao')
          .eq('id', pedidoRef.loja_id)
          .maybeSingle();
        if (loja?.descricao) {
          const meta = extrairMetaDescricao(loja.descricao);
          tokenDaLoja = meta.mercado_pago_access_token || null;
        }
      }
    } catch {}

    // Consulta status real na API do Mercado Pago
    const resultado = await consultarCobrancaPixMercadoPago(idTransacao, tokenDaLoja);

    if (!resultado) {
      return NextResponse.json({ mensagem: 'Não foi possível validar pagamento' }, { status: 200 });
    }

    if (resultado.pago) {
      const agora = new Date().toISOString();

      let pedido: any = null;

      if (resultado.idPedido) {
        const { data: pId } = await supabase.from('pedidos').select('*').eq('id', resultado.idPedido).maybeSingle();
        if (pId) pedido = pId;
      }

      if (!pedido) {
        const { data: pRef } = await supabase.from('pedidos').select('*').like('referencia', `%${idTransacao}%`).maybeSingle();
        if (pRef) pedido = pRef;
      }

      if (!pedido) {
        const { data: pTx } = await supabase.from('pedidos').select('*').eq('pix_id_transacao', idTransacao).maybeSingle();
        if (pTx) pedido = pTx;
      }

      if (pedido) {
        // Avança para 'recebido' para entrar no fluxo de cozinha
        const novaSituacao = pedido.situacao === 'aguardando_pix' ? 'recebido' : pedido.situacao;

        const { error: errUp } = await supabase
          .from('pedidos')
          .update({
            situacao: novaSituacao,
            pix_pago: true,
            atualizado_em: agora,
          })
          .eq('id', pedido.id);

        if (errUp && errUp.code === 'PGRST204') {
          let refObj: any = {};
          try {
            refObj = JSON.parse(pedido.referencia || '{}');
          } catch {}
          refObj.pago = true;
          refObj.pago_em = agora;

          await supabase
            .from('pedidos')
            .update({
              situacao: novaSituacao,
              referencia: JSON.stringify(refObj),
              atualizado_em: agora,
            })
            .eq('id', pedido.id);
        }

        console.log(`[PIX Aprovado] Pedido ${pedido.id} confirmado e liberado para a cozinha!`);
      }
    }

    return NextResponse.json({ status: 'ok', recebido: true });
  } catch (err) {
    console.warn('Erro ao processar webhook do Mercado Pago:', err);
    return NextResponse.json({ status: 'erro' }, { status: 200 });
  }
}

// O Mercado Pago também faz requisições GET para validar o endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', servico: 'KodFood PIX Webhook' });
}
