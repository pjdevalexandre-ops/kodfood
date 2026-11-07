import { supabaseServidor } from '@/lib/supabase-servidor';
import { consultarCobrancaPixMercadoPago } from '@/servicos/mercado-pago';
import {
  lerPedidosDoServidor,
  salvarPedidosNoServidor,
} from '@/servicos/armazenamento-pedidos-servidor';

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

  // 1. Consulta o status real na API do Mercado Pago primeiro
  const resultadoMp = await consultarCobrancaPixMercadoPago(idTransacao, tokenLoja);
  if (!resultadoMp) {
    return { sucesso: false, mensagem: 'Não foi possível consultar transação no Mercado Pago' };
  }

  // 2. Localiza o pedido se não tiver sido passado
  let pedido = pedidoExistente;
  if (!pedido) {
    // 2.1 Tenta buscar por pix_id_transacao
    try {
      const { data: pTx } = await supabaseServidor
        .from('pedidos')
        .select('*')
        .eq('pix_id_transacao', idTransacao)
        .maybeSingle();
      if (pTx) pedido = pTx;
    } catch {}

    // 2.2 Se o Mercado Pago retornou external_reference (ID do pedido), busca diretamente por ID
    if (!pedido && resultadoMp.idPedido) {
      try {
        const { data: pRef } = await supabaseServidor
          .from('pedidos')
          .select('*')
          .eq('id', resultadoMp.idPedido)
          .maybeSingle();
        if (pRef) pedido = pRef;
      } catch {}
    }

    // 2.3 Tenta por codigo_acompanhamento ou referencia
    if (!pedido && resultadoMp.idPedido) {
      try {
        const { data: pCod } = await supabaseServidor
          .from('pedidos')
          .select('*')
          .eq('codigo_acompanhamento', resultadoMp.idPedido)
          .maybeSingle();
        if (pCod) pedido = pCod;
      } catch {}
    }

    // 2.4 Fallback para memória/disco do servidor
    if (!pedido) {
      const pedidosLocais = lerPedidosDoServidor();
      pedido = pedidosLocais.find(
        (p: any) =>
          p.pix_id_transacao === idTransacao ||
          p.id === resultadoMp.idPedido ||
          p.codigo_acompanhamento === resultadoMp.idPedido
      );
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

  const agora = new Date().toISOString();

  // 3. Status aprovado: validações de segurança
  if (resultadoMp.pago) {
    // Validação estrita de valor (centavos) com tolerância de 1 centavo para arredondamentos
    if (Math.abs(resultadoMp.valorCentavos - pedido.total_centavos) > 1) {
      console.error(
        `[Segurança PIX] Divergência de valor no pedido ${pedido.id}: Pago R$ ${resultadoMp.valorCentavos / 100} != Total R$ ${pedido.total_centavos / 100}`
      );
      return { sucesso: false, mensagem: 'Valor pago diverge do total do pedido' };
    }

    // Define a nova situação
    let novaSituacao = pedido.situacao;
    if (pedido.situacao === 'aguardando_pix') {
      novaSituacao = 'recebido';
    } else if (pedido.situacao === 'cancelado') {
      console.warn(`[Aviso Reembolso] Pedido ${pedido.id} pago após ter sido cancelado. Necessário reembolso.`);
    }

    // Atualiza no Supabase
    try {
      await supabaseServidor
        .from('pedidos')
        .update({
          situacao: novaSituacao,
          pix_pago: true,
          pix_id_transacao: idTransacao,
          atualizado_em: agora,
        })
        .eq('id', pedido.id);
    } catch (eUp) {
      console.warn('[Confirmar Pix] Erro ao atualizar no Supabase:', eUp);
    }

    // Atualiza também no armazenamento local do servidor se existir
    try {
      const pedidosLocais = lerPedidosDoServidor();
      const idx = pedidosLocais.findIndex(
        (p: any) => p.id === pedido.id || p.codigo_acompanhamento === pedido.codigo_acompanhamento
      );
      if (idx !== -1) {
        pedidosLocais[idx] = {
          ...pedidosLocais[idx],
          situacao: novaSituacao,
          pix_pago: true,
          pix_id_transacao: idTransacao,
          atualizado_em: agora,
        };
        salvarPedidosNoServidor(pedidosLocais);
      }
    } catch {}

    console.log(`[PIX Aprovado] Pedido #${pedido.numero || pedido.id} liquidado com sucesso e avançado para ${novaSituacao}`);
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
    try {
      await supabaseServidor
        .from('pedidos')
        .update({
          situacao: 'cancelado',
          observacao: pedido.observacao
            ? `${pedido.observacao} | Cancelado: PIX não aprovado (${statusMp})`
            : `Cancelado: PIX não aprovado (${statusMp})`,
          atualizado_em: agora,
        })
        .eq('id', pedido.id);
    } catch {}

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
