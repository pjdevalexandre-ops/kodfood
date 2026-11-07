import { NextRequest, NextResponse } from 'next/server';
import { supabaseServidor } from '@/lib/supabase-servidor';
import { exigirSessaoDoPainel } from '@/lib/autenticacao-painel';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pedidoId = params.id;
    if (!pedidoId) {
      return NextResponse.json({ erro: 'ID do pedido obrigatório' }, { status: 400 });
    }

    // 1. Localiza o pedido no banco
    const { data: pedido, error: errPed } = await supabaseServidor
      .from('pedidos')
      .select('id, loja_id, situacao, pix_pago, total_centavos, numero')
      .eq('id', pedidoId)
      .maybeSingle();

    if (errPed || !pedido) {
      return NextResponse.json({ erro: 'Pedido não encontrado' }, { status: 404 });
    }

    // 2. Valida a sessão do painel para a loja do pedido
    const auth = await exigirSessaoDoPainel(req, pedido.loja_id);
    if (!auth.autorizado && auth.respostaErro) {
      return auth.respostaErro;
    }

    // 3. Atualiza para pago e avança de 'aguardando_pix' para 'recebido'
    const agora = new Date().toISOString();
    const novaSituacao = pedido.situacao === 'aguardando_pix' ? 'recebido' : pedido.situacao;

    const { data: atualizados, error: errUp } = await supabaseServidor
      .from('pedidos')
      .update({
        pix_pago: true,
        situacao: novaSituacao,
        atualizado_em: agora,
      })
      .eq('id', pedido.id)
      .select('id');

    if (errUp || !atualizados || atualizados.length === 0) {
      console.error('[confirmar-pix] Erro ao atualizar pedido no banco:', errUp);
      return NextResponse.json({ erro: 'Falha ao atualizar status do pedido' }, { status: 500 });
    }

    console.log(`[Confirmação Manual PIX] Pedido #${pedido.numero || pedido.id} confirmado manualmente pelo lojista.`);
    return NextResponse.json({
      sucesso: true,
      pedido_id: pedido.id,
      pix_pago: true,
      situacao: novaSituacao,
    });
  } catch (err: any) {
    console.error('Erro ao confirmar PIX manualmente:', err);
    return NextResponse.json({ erro: 'Erro interno ao confirmar PIX' }, { status: 500 });
  }
}
