import { NextRequest, NextResponse } from 'next/server';
import { criarCobrancaPixMercadoPago } from '@/servicos/mercado-pago';
import { supabaseServidor } from '@/lib/supabase-servidor';
import {
  lerPedidosDoServidor,
  salvarPedidosNoServidor,
} from '@/servicos/armazenamento-pedidos-servidor';

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
    const { idPedido, lojaId, codigoAcompanhamento, valorCentavos, nomeCliente } = body;

    if (!idPedido || !lojaId) {
      return NextResponse.json(
        { erro: 'Parâmetros idPedido e lojaId são obrigatórios' },
        { status: 400 }
      );
    }

    const ehUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idPedido);
    const ehCodigoUuid = codigoAcompanhamento
      ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codigoAcompanhamento)
      : false;

    // 1. Busca o pedido real no banco de dados para segurança de valor e status
    let pedido: any = null;
    let errPed: any = null;

    try {
      if (ehUuid) {
        const res = await supabaseServidor
          .from('pedidos')
          .select('*')
          .or(`id.eq.${idPedido},codigo_acompanhamento.eq.${idPedido}`)
          .maybeSingle();
        pedido = res.data;
        errPed = res.error;
      } else if (ehCodigoUuid) {
        const res = await supabaseServidor
          .from('pedidos')
          .select('*')
          .eq('codigo_acompanhamento', codigoAcompanhamento)
          .maybeSingle();
        pedido = res.data;
        errPed = res.error;
      }
    } catch (eConsulta) {
      console.warn('[gerar-pix] Erro ao consultar Supabase:', eConsulta);
    }

    // Se não encontrou no Supabase, tenta buscar no arquivo/memória do servidor
    if (!pedido) {
      const pedidosLocais = lerPedidosDoServidor();
      pedido = pedidosLocais.find(
        (p: any) =>
          p.id === idPedido ||
          p.codigo_acompanhamento === idPedido ||
          (codigoAcompanhamento && p.codigo_acompanhamento === codigoAcompanhamento)
      );
    }

    // Se mesmo assim não encontrou, mas o formulário enviou os dados do pedido recém-criado
    if (!pedido && valorCentavos && valorCentavos > 0) {
      pedido = {
        id: idPedido,
        numero: 1,
        total_centavos: Number(valorCentavos),
        situacao: 'aguardando_pix',
        pix_pago: false,
        nome_cliente: nomeCliente || 'Cliente',
        loja_id: lojaId,
      };
    }

    if (!pedido) {
      if (errPed) console.error('[gerar-pix] Detalhes do erro Supabase:', errPed);
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

    // Se a loja não tem token próprio e o ambiente possui token geral dedicado
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

    // 3. Cria a cobrança no Mercado Pago usando o valor oficial
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

    // Se o pedido está no Supabase (ehUuid), atualiza no Supabase
    if (ehUuid || (pedido.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pedido.id))) {
      const { error: errUp } = await supabaseServidor
        .from('pedidos')
        .update({
          pix_copia_e_cola: resultadoPix.copiaECola,
          pix_qr_code_base64: resultadoPix.qrCodeBase64,
          pix_expira_em: resultadoPix.expiraEm,
          pix_id_transacao: resultadoPix.idTransacao,
          atualizado_em: agoraIso,
        })
        .eq('id', pedido.id);

      if (errUp) {
        console.warn('[gerar-pix] Aviso ao persistir no Supabase (colunas podem estar em migração):', errUp);
      }
    }

    // Atualiza também no armazenamento do servidor local se existir
    const pedidosLocais = lerPedidosDoServidor();
    const idx = pedidosLocais.findIndex(
      (p: any) =>
        p.id === idPedido ||
        p.codigo_acompanhamento === idPedido ||
        (codigoAcompanhamento && p.codigo_acompanhamento === codigoAcompanhamento)
    );
    if (idx !== -1) {
      pedidosLocais[idx] = {
        ...pedidosLocais[idx],
        pix_copia_e_cola: resultadoPix.copiaECola,
        pix_qr_code_base64: resultadoPix.qrCodeBase64,
        pix_expira_em: resultadoPix.expiraEm,
        pix_id_transacao: resultadoPix.idTransacao,
        situacao: 'aguardando_pix',
      };
      salvarPedidosNoServidor(pedidosLocais);
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
