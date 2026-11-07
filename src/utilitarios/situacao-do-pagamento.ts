import { Pedido } from '@/tipos';
import { formatarPreco } from './formatadores';

export type TomDoPagamento = 'confirmado' | 'pendente' | 'cobrar' | 'alerta' | 'neutro';

export interface SituacaoDoPagamento {
  rotulo: string;
  detalhe?: string;
  tom: TomDoPagamento;
  confirmado: boolean;
}

export function obterSituacaoDoPagamento(pedido: Pedido, agora = Date.now()): SituacaoDoPagamento {
  if (pedido.tipo === 'mesa' && pedido.situacao !== 'entregue') {
    return {
      rotulo: 'Conta da mesa',
      detalhe: 'Cobrança no fechamento da conta',
      tom: 'neutro',
      confirmado: false,
    };
  }

  const entregue = pedido.situacao === 'entregue';

  switch (pedido.forma_pagamento) {
    case 'pix':
      if (pedido.pix_pago === true) {
        return { rotulo: 'PIX pago', tom: 'confirmado', confirmado: true };
      }
      if (pedido.pix_expira_em && new Date(pedido.pix_expira_em).getTime() < agora) {
        return {
          rotulo: 'PIX expirado',
          detalhe: 'O cliente não pagou a tempo',
          tom: 'alerta',
          confirmado: false,
        };
      }
      return {
        rotulo: 'Aguardando PIX',
        detalhe: 'Não prepare antes da confirmação',
        tom: 'pendente',
        confirmado: false,
      };

    case 'dinheiro': {
      if (entregue) {
        return { rotulo: 'Dinheiro recebido', tom: 'confirmado', confirmado: true };
      }
      const troco = pedido.troco_para_centavos
        ? pedido.troco_para_centavos - pedido.total_centavos
        : 0;
      return {
        rotulo: `Cobrar ${formatarPreco(pedido.total_centavos)} em dinheiro`,
        detalhe: troco > 0 ? `Levar troco de ${formatarPreco(troco)}` : 'Sem troco',
        tom: 'cobrar',
        confirmado: false,
      };
    }

    default:
      if (entregue) {
        return { rotulo: 'Cartão recebido', tom: 'confirmado', confirmado: true };
      }
      return {
        rotulo: `Cobrar ${formatarPreco(pedido.total_centavos)} no cartão`,
        detalhe: 'Levar a maquininha',
        tom: 'cobrar',
        confirmado: false,
      };
  }
}
