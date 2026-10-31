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
    <div className="hidden print:block print:p-0 print:m-0 print:text-black print:font-mono text-[11px] leading-tight max-w-[76mm] mx-auto">
      {/* Cabeçalho compacto */}
      <div className="text-center border-b border-dashed border-black pb-1 mb-1">
        <h1 className="text-xs font-bold uppercase tracking-wider">{nomeLoja}</h1>
        <div className="text-base font-black mt-0.5">PEDIDO #{pedido.numero}</div>
        <p className="text-[10px] text-stone-600">{dataHora}</p>
      </div>

      {/* Tipo e Cliente */}
      <div className="border-b border-dashed border-black pb-1 mb-1">
        <p className="font-bold text-xs uppercase text-center py-0.5">
          {pedido.tipo === 'entrega'
            ? '[ ENTREGA EM DOMICÍLIO ]'
            : pedido.tipo === 'mesa'
            ? `[ ${pedido.comanda_identificador?.toUpperCase() || 'MESA'} - SALÃO ]`
            : '[ RETIRADA NO BALCÃO ]'}
        </p>
        <p className="font-bold mt-0.5">Cliente: {pedido.nome_cliente}</p>
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
      <div className="border-b border-dashed border-black pb-1 mb-1">
        <div className="font-bold text-[10px] uppercase mb-0.5">ITENS DO PEDIDO:</div>
        <div className="space-y-1">
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
                <div className="pl-2 text-[10px]">
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
                <p className="pl-2 text-[10px] font-bold">
                  * OBS: {item.observacao}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Totais e Pagamento */}
      <div className="border-b border-dashed border-black pb-1 mb-1 space-y-0.5">
        {pedido.taxa_entrega_centavos > 0 && (
          <>
            <div className="flex justify-between text-[10px]">
              <span>Subtotal:</span>
              <span>{formatarPreco(pedido.subtotal_centavos)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>Taxa Entrega:</span>
              <span>{formatarPreco(pedido.taxa_entrega_centavos)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between font-black text-xs pt-0.5 border-t border-dotted border-black">
          <span>TOTAL:</span>
          <span>{formatarPreco(pedido.total_centavos)}</span>
        </div>
      </div>

      {/* Forma de Pagamento e Rodapé Compacto */}
      <div className="text-center pt-0.5 text-[10px]">
        <p className="font-bold uppercase">
          PAGAMENTO: {pedido.forma_pagamento.replace('_', ' ')}
        </p>
        {pedido.forma_pagamento === 'dinheiro' && pedido.troco_para_centavos && (
          <p className="font-bold">
            Troco para: {formatarPreco(pedido.troco_para_centavos)}
          </p>
        )}
        <p className="mt-1 text-[9px] text-stone-500">
          KodFood · {nomeLoja}
        </p>
      </div>
    </div>
  );
}
