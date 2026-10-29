'use client';

import { Pedido } from '@/tipos';
import { formatarPreco, formatarTelefone } from '@/utilitarios/formatadores';

interface ComandaImpressaoProps {
  pedido: Pedido | null;
  nomeLoja: string;
}

export function ComandaImpressao({ pedido, nomeLoja }: ComandaImpressaoProps) {
  if (!pedido) return null;

  const dataHora = new Date(pedido.feito_em).toLocaleString('pt-BR');

  return (
    <div className="hidden print:block print:p-2 print:text-black print:font-mono text-xs max-w-[80mm] mx-auto">
      {/* Cabeçalho */}
      <div className="text-center border-b border-dashed border-black pb-2 mb-2">
        <h1 className="text-base font-bold uppercase">{nomeLoja}</h1>
        <div className="text-xl font-black mt-1">PEDIDO #{pedido.numero}</div>
        <p className="text-[11px] mt-0.5">{dataHora}</p>
      </div>

      {/* Tipo e Cliente */}
      <div className="border-b border-dashed border-black pb-2 mb-2">
        <p className="font-bold text-sm uppercase">
          {pedido.tipo === 'entrega'
            ? '>>> ENTREGA <<<'
            : pedido.tipo === 'mesa'
            ? `>>> ${pedido.comanda_identificador?.toUpperCase() || 'MESA'} - SALÃO <<<`
            : '>>> RETIRADA NO BALCÃO <<<'}
        </p>
        <p className="font-bold mt-1">Cliente: {pedido.nome_cliente}</p>
        <p>Telefone: {formatarTelefone(pedido.telefone_cliente)}</p>

        {pedido.tipo === 'entrega' && (
          <div className="mt-1 pt-1 border-t border-dotted border-black">
            <p className="font-bold">
              {pedido.rua}, {pedido.numero_casa}
              {pedido.complemento ? ` (${pedido.complemento})` : ''}
            </p>
            <p>Bairro: {pedido.nome_do_bairro}</p>
            {pedido.referencia && <p>Ref: {pedido.referencia}</p>}
          </div>
        )}
      </div>

      {/* Itens */}
      <div className="border-b border-dashed border-black pb-2 mb-2">
        <div className="font-bold text-xs uppercase mb-1">Itens do Pedido:</div>
        <div className="space-y-2">
          {pedido.itens?.map((item, idx) => (
            <div key={idx} className="space-y-0.5">
              <div className="flex justify-between font-bold">
                <span>
                  {item.quantidade}x {item.nome_produto}
                </span>
                <span>
                  {formatarPreco(item.preco_unitario_centavos * item.quantidade)}
                </span>
              </div>

              {item.adicionais && item.adicionais.length > 0 && (
                <div className="pl-3 text-[11px]">
                  {item.adicionais.map((ad, i) => (
                    <div key={i} className="flex justify-between">
                      <span>+ {ad.nome_adicional}</span>
                      {ad.preco_centavos > 0 && (
                        <span>{formatarPreco(ad.preco_centavos)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {item.observacao && (
                <p className="pl-3 text-[11px] font-bold">
                  * OBS: {item.observacao}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Totais e Pagamento */}
      <div className="border-b border-dashed border-black pb-2 mb-2 space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatarPreco(pedido.subtotal_centavos)}</span>
        </div>
        <div className="flex justify-between">
          <span>Taxa Entrega:</span>
          <span>{formatarPreco(pedido.taxa_entrega_centavos)}</span>
        </div>
        <div className="flex justify-between font-black text-sm pt-1 border-t border-dotted border-black">
          <span>TOTAL:</span>
          <span>{formatarPreco(pedido.total_centavos)}</span>
        </div>
      </div>

      <div className="text-center pt-1 text-[11px]">
        <p className="font-bold uppercase">
          Pagamento: {pedido.forma_pagamento.replace('_', ' ')}
        </p>
        {pedido.forma_pagamento === 'dinheiro' && pedido.troco_para_centavos && (
          <p className="font-bold">
            Troco para: {formatarPreco(pedido.troco_para_centavos)}
          </p>
        )}
        <p className="mt-2 text-[10px]">KodFood · Sistema para Lanchonetes</p>
      </div>
    </div>
  );
}
