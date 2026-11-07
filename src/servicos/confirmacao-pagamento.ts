import { supabaseServidor } from '@/lib/supabase-servidor';
import { consultarCobrancaPixMercadoPago } from '@/servicos/mercado-pago';

export interface ResultadoProcessamentoPix {
  sucesso: boolean;
  mensagem: string;
  pago?: boolean;
  statusMercadoPago?: string;
  pedidoId?: string;
}

/**
 * Processa a confirmação de uma transação Pix do Mercado Pago para um pedido.
 * Utilizado de forma idêntica pelo Webhook do Mercado Pago e pelo polling da tela de acompanhamento.
 */
export async function processarTransacaoPix(
  idTransacao: string,
  tokenLoja?: string | null,
  pedidoExistente?: any
): Promise<ResultadoProcessamentoPix> {
  if (!idTransacao) {
    return { sucesso: false, mensagem: 'ID de transação não informado' };
  }

  // 1. Localiza o pedido se não tiver sido passado
  let pedido = pedidoExistente;
  if (!pedido) {
    const { data: pTx } = await supabaseServidor
      .from('pedidos')
      .select('*')
      .eq('pix_id_transacao', idTransacao)
      .maybeSingle();

    if (pTx) {
      pedido = pTx;
    } else {
      const { data: pRef } = await supabaseServidor
        .from('pedidos')
        .select('*')
        .like('referencia', `%${idTransacao}%`)
        .maybeSingle();
      if (pRef) pedido = pRef;
    }
  }

  if (!pedido) {
    return { sucesso: false, mensagem: 'Pedido não localizado para a transação informada' };
  }

  // Idempotência: se já está pago, não refaz
  if (pedido.pix_pago === true) {
    return {
      sucesso: true,
      mensagem: 'Pagamento já havia sido confirmado anteriormente (idempotente)',
      pago: true,
      pedidoId: pedido.id,
    };
  }

  // 2. Consulta o status real na API do Mercado Pago
  const resultadoMp = await consultarCobrancaPixMercadoPago(idTransacao, tokenLoja);
  if (!resultadoMp) {
    return { sucesso: false, mensagem: 'Não foi possível consultar transação no Mercado Pago' };
  }

  const agora = new Date().toISOString();

  // 3. Status aprovado: validações de segurança
  if (resultadoMp.pago) {
    // Validação de correspondência de ID (se retornado pelo Mercado Pago)
    if (resultadoMp.idPedido && resultadoMp.idPedido !== pedido.id) {
      console.error(
        `[Segurança PIX] Inconsistência de ID: retornado pelo MP ${resultadoMp.idPedido} != pedido no banco ${pedido.id}`
      );
      return { sucesso: false, mensagem: 'Identificador de pedido divergente' };
    }

    // Validação estrita de valor (centavos)
    if (resultadoMp.valorCentavos !== pedido.total_centavos) {
      console.error(
        `[Segurança PIX] Divergência de valor no pedido ${pedido.id}: Pago R$ ${resultadoMp.valorCentavos / 100} != Total R$ ${pedido.total_centavos / 100}`
      );
      return { sucesso: false, mensagem: 'Valor pago diverge do total do pedido' };
    }

    // Define a nova situação
    // Se o pedido estava cancelado previamente, marca pago para controle de reembolso
    let novaSituacao = pedido.situacao;
    if (pedido.situacao === 'aguardando_pix') {
      novaSituacao = 'recebido';
    } else if (pedido.situacao === 'cancelado') {
      console.warn(`[Aviso Reembolso] Pedido ${pedido.id} pago após ter sido cancelado. Necessário reembolso.`);
    }

    const { data: atualizados, error: errUp } = await supabaseServidor
      .from('pedidos')
      .update({
        situacao: novaSituacao,
        pix_pago: true,
        atualizado_em: agora,
      })
      .eq('id', pedido.id)
      .select('id');

    if (errUp || !atualizados || atualizados.length === 0) {
      console.error(`[Erro DB] Falha ao gravar pix_pago no pedido ${pedido.id}:`, errUp);
      return { sucesso: false, mensagem: 'Erro de persistência no banco de dados' };
    }

    console.log(`[PIX Aprovado] Pedido ${pedido.numero || pedido.id} liquidado com sucesso e avançado para ${novaSituacao}`);
    return {
      sucesso: true,
      mensagem: 'Pagamento confirmado com sucesso',
      pago: true,
      statusMercadoPago: resultadoMp.status,
      pedidoId: pedido.id,
    };
  }

  // 4. Status de expiração ou rejeição
  const statusMp = resultadoMp.status?.toLowerCase();
  if (['cancelled', 'rejected'].includes(statusMp) && pedido.situacao === 'aguardando_pix') {
    await supabaseServidor
      .from('pedidos')
      .update({
        situacao: 'cancelado',
        observacao: pedido.observacao
          ? `${pedido.observacao} | Cancelado: PIX não aprovado (${statusMp})`
          : `Cancelado: PIX não aprovado (${statusMp})`,
        atualizado_em: agora,
      })
      .eq('id', pedido.id)
      .select('id');

    return {
      sucesso: true,
      mensagem: `Pedido cancelado devido ao status ${statusMp}`,
      pago: false,
      statusMercadoPago: resultadoMp.status,
      pedidoId: pedido.id,
    };
  }

  return {
    sucesso: true,
    mensagem: `Transação em estado ${resultadoMp.status}`,
    pago: false,
    statusMercadoPago: resultadoMp.status,
    pedidoId: pedido.id,
  };
}
