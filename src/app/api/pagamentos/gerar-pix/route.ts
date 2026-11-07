import { NextRequest, NextResponse } from 'next/server';
import { criarCobrancaPixMercadoPago } from '@/servicos/mercado-pago';
import { supabaseServidor } from '@/lib/supabase-servidor';

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
    const { idPedido, lojaId } = body;

    if (!idPedido || !lojaId) {
      return NextResponse.json(
        { erro: 'Parâmetros idPedido e lojaId são obrigatórios' },
        { status: 400 }
      );
    }

    // 1. Busca o pedido real no banco de dados para segurança de valor e status
    const { data: pedido, error: errPed } = await supabaseServidor
      .from('pedidos')
      .select('id, numero, total_centavos, situacao, pix_pago, pix_id_transacao, pix_copia_e_cola, pix_qr_code_base64, pix_expira_em, nome_cliente, loja_id')
      .eq('id', idPedido)
      .maybeSingle();

    if (errPed || !pedido) {
      return NextResponse.json({ erro: 'Pedido não localizado no banco de dados' }, { status: 404 });
    }

    // Se já está pago, rejeita com 409
    if (pedido.pix_pago === true) {
      return NextResponse.json({ erro: 'Este pedido já foi pago' }, { status: 409 });
    }

    // Idempotência: Se já tem cobrança Pix gerada e ainda dentro do prazo de validade, reutiliza
    const agora = Date.now();
    if (
      pedido.pix_id_transacao &&
      pedido.pix_copia_e_cola &&
      pedido.pix_expira_em &&
      new Date(pedido.pix_expira_em).getTime() > agora
    ) {
      return NextResponse.json({
        idTransacao: pedido.pix_id_transacao,
        copiaECola: pedido.pix_copia_e_cola,
        qrCodeBase64: pedido.pix_qr_code_base64 || '',
        expiraEm: pedido.pix_expira_em,
        status: 'pending',
      });
    }

    // 2. Busca token exclusivo da loja (sem usar token compartilhado de terceiros)
    let tokenLoja: string | null = null;
    let lojaNome = 'KodFood';

    try {
      const { data: loja } = await supabaseServidor
        .from('lojas')
        .select('nome, descricao')
        .eq('id', lojaId)
        .maybeSingle();

      if (loja) {
        lojaNome = loja.nome || lojaNome;
        const meta = extrairMetaLojaDescricao(loja.descricao);
        tokenLoja = meta.mercado_pago_access_token || null;
      }
    } catch (e) {
      console.warn('Erro ao carregar dados da loja para Pix:', e);
    }

    // Se a loja não tem token próprio e o ambiente não possui token geral dedicado
    if (!tokenLoja && process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      tokenLoja = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    }

    if (!tokenLoja) {
      return NextResponse.json(
        {
          erro: 'Loja não possui integração Pix do Mercado Pago configurada. Utilize a chave Pix manual da loja.',
          requerPixManual: true,
        },
        { status: 422 }
      );
    }

    // 3. Cria a cobrança no Mercado Pago usando o valor oficial do banco
    const resultadoPix = await criarCobrancaPixMercadoPago({
      valorCentavos: pedido.total_centavos,
      descricao: `Pedido #${pedido.numero || ''} no ${lojaNome}`.trim(),
      idPedido: pedido.id,
      nomeCliente: pedido.nome_cliente || 'Cliente',
      emailCliente: body.emailCliente,
      tokenLoja,
    });

    if (!resultadoPix) {
      return NextResponse.json(
        { erro: 'Falha na comunicação com o Mercado Pago para gerar o QR Code' },
        { status: 502 }
      );
    }

    // 4. Grava os dados do Pix no pedido sem alterar a situação para 'recebido'
    const agoraIso = new Date().toISOString();
    const { error: errUp } = await supabaseServidor
      .from('pedidos')
      .update({
        pix_copia_e_cola: resultadoPix.copiaECola,
        pix_qr_code_base64: resultadoPix.qrCodeBase64,
        pix_expira_em: resultadoPix.expiraEm,
        pix_id_transacao: resultadoPix.idTransacao,
        atualizado_em: agoraIso,
      })
      .eq('id', pedido.id)
      .select('id');

    if (errUp) {
      console.error('[gerar-pix] Erro ao persistir colunas do Pix no pedido:', errUp);
      return NextResponse.json(
        {
          erro: 'As colunas de Pix não foram encontradas no Supabase. Execute o arquivo supabase/migracao-pix-mercadopago.sql.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(resultadoPix);
  } catch (err: any) {
    console.error('Erro na rota gerar-pix:', err);
    return NextResponse.json(
      { erro: err?.message || 'Erro interno ao gerar PIX' },
      { status: 500 }
    );
  }
}
