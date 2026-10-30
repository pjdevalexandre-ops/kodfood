import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { lerPedidosDoServidor } from '@/servicos/armazenamento-pedidos-servidor';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { codigo: string } }
) {
  // 1. Tenta buscar no Supabase
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        lojas ( nome, link, telefone_whatsapp, cor_principal, endereco ),
        pedido_itens (
          id, nome_produto, quantidade, preco_unitario_centavos, observacao,
          pedido_item_adicionais ( id, nome_adicional, preco_centavos )
        )
      `)
      .eq('codigo_acompanhamento', params.codigo)
      .maybeSingle();

    if (!error && data) {
      const formatado = {
        ...data,
        itens: (data.pedido_itens || []).map((it: any) => ({
          ...it,
          adicionais: it.pedido_item_adicionais || [],
        })),
      };
      return NextResponse.json(formatado);
    }
  } catch (err) {
    console.warn('Erro ao consultar acompanhamento no Supabase via API:', err);
  }

  // 2. Fallback de servidor local
  const pedidos = lerPedidosDoServidor();
  const pedido = pedidos.find((p: any) => p.codigo_acompanhamento === params.codigo);
  if (!pedido) {
    return NextResponse.json(null, { status: 404 });
  }
  return NextResponse.json(pedido);
}
