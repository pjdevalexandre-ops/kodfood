import { NextRequest, NextResponse } from 'next/server';
import { consultarCobrancaPixMercadoPago } from '@/servicos/mercado-pago';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // O Mercado Pago pode enviar o ID da transação na URL ou no corpo
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

    // Consulta status real na API do Mercado Pago
    const resultado = await consultarCobrancaPixMercadoPago(idTransacao);

    if (!resultado) {
      return NextResponse.json({ mensagem: 'Não foi possível validar pagamento' }, { status: 200 });
    }

    if (resultado.pago) {
      const agora = new Date().toISOString();

      // 1. Tenta localizar o pedido no Supabase por ID ou transação
      let pedido: any = null;

      if (resultado.idPedido) {
        const { data: pId } = await supabase.from('pedidos').select('*').eq('id', resultado.idPedido).maybeSingle();
        if (pId) pedido = pId;
      }

      if (!pedido) {
        const { data: pRef } = await supabase.from('pedidos').select('*').like('referencia', `%${idTransacao}%`).maybeSingle();
        if (pRef) pedido = pRef;
      }

      if (pedido) {
        // Se o pedido estava aguardando o PIX, avança para 'recebido' para entrar no fluxo de cozinha!
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
    return NextResponse.json({ status: 'erro' }, { status: 200 }); // Sempre 200 para o Mercado Pago não travar retry
  }
}

// O Mercado Pago também faz requisições GET para validar o endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', servico: 'KodFood PIX Webhook' });
}
