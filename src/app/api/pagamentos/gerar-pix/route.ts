import { NextRequest, NextResponse } from 'next/server';
import { criarCobrancaPixMercadoPago } from '@/servicos/mercado-pago';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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

    // Busca se a loja possui Access Token próprio
    let tokenLoja: string | null = null;
    let lojaNome = 'KodFood Delivery';

    try {
      const { data: loja } = await supabase
        .from('lojas')
        .select('nome, mercado_pago_access_token')
        .eq('id', lojaId)
        .maybeSingle();

      if (loja) {
        tokenLoja = (loja as any).mercado_pago_access_token || null;
        lojaNome = loja.nome || lojaNome;
      }
    } catch {}

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
          situacao: 'recebido', // Mantém 'recebido' para compatibilidade com a enum do banco
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
