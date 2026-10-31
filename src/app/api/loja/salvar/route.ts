import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { Loja, HorarioFuncionamento } from '@/tipos';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lojaId, dadosLoja, horarios } = body as {
      lojaId: string;
      dadosLoja: Partial<Loja>;
      horarios?: HorarioFuncionamento[];
    };

    if (!dadosLoja) {
      return NextResponse.json({ erro: 'Dados incompletos para atualizar a loja' }, { status: 400 });
    }

    // 1. Extrai metadados que não possuem colunas nativas no banco
    const metaEstendida: Record<string, any> = {};
    if (dadosLoja.chave_pix !== undefined) metaEstendida.chave_pix = dadosLoja.chave_pix;
    if (dadosLoja.nome_titular_pix !== undefined) metaEstendida.nome_titular_pix = dadosLoja.nome_titular_pix;
    if (dadosLoja.mercado_pago_access_token !== undefined) metaEstendida.mercado_pago_access_token = dadosLoja.mercado_pago_access_token;
    if (dadosLoja.pix_automatico_ativo !== undefined) metaEstendida.pix_automatico_ativo = dadosLoja.pix_automatico_ativo;
    if (dadosLoja.senha_painel !== undefined) metaEstendida.senha_painel = dadosLoja.senha_painel;

    // 2. Prepara a descrição embutindo metadados como comentário invisível seguro
    let descricaoParaSalvar = (dadosLoja.descricao || '').replace(/<!--kodfood_meta:[\s\S]*?-->/, '').trim();
    if (Object.keys(metaEstendida).length > 0) {
      descricaoParaSalvar = `${descricaoParaSalvar}\n<!--kodfood_meta:${JSON.stringify(metaEstendida)}-->`.trim();
    }

    // 3. Monta o objeto contendo estritamente as colunas válidas da tabela lojas
    const payloadSupabase: Record<string, any> = {};
    if (dadosLoja.nome !== undefined) payloadSupabase.nome = dadosLoja.nome;
    if (dadosLoja.descricao !== undefined || Object.keys(metaEstendida).length > 0) payloadSupabase.descricao = descricaoParaSalvar;
    if (dadosLoja.telefone_whatsapp !== undefined) payloadSupabase.telefone_whatsapp = dadosLoja.telefone_whatsapp;
    if (dadosLoja.logo_url !== undefined) payloadSupabase.logo_url = dadosLoja.logo_url;
    if (dadosLoja.capa_url !== undefined) payloadSupabase.capa_url = dadosLoja.capa_url;
    if (dadosLoja.cor_principal !== undefined) payloadSupabase.cor_principal = dadosLoja.cor_principal;
    if (dadosLoja.endereco !== undefined) payloadSupabase.endereco = dadosLoja.endereco;
    if (dadosLoja.aberta !== undefined) payloadSupabase.aberta = dadosLoja.aberta;
    if (dadosLoja.aceita_entrega !== undefined) payloadSupabase.aceita_entrega = dadosLoja.aceita_entrega;
    if (dadosLoja.aceita_retirada !== undefined) payloadSupabase.aceita_retirada = dadosLoja.aceita_retirada;
    if (dadosLoja.pedido_minimo_centavos !== undefined) payloadSupabase.pedido_minimo_centavos = dadosLoja.pedido_minimo_centavos;

    // 4. Localiza e atualiza no Supabase por id (se UUID) ou por link
    let query = supabase.from('lojas').update(payloadSupabase);

    const ehUuid = lojaId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lojaId);
    if (ehUuid) {
      query = query.eq('id', lojaId);
    } else if (dadosLoja.link) {
      query = query.eq('link', dadosLoja.link);
    } else {
      query = query.eq('link', 'lanchonete-do-ze');
    }

    const { data: atualizadaDb, error: erroDb } = await query.select('*').maybeSingle();

    if (erroDb) {
      console.error('Erro ao atualizar loja no Supabase via API:', erroDb);
      return NextResponse.json({ erro: erroDb.message }, { status: 500 });
    }

    // 5. Invalidação de cache nas rotas do Next.js
    try {
      revalidatePath('/painel/loja');
      revalidatePath('/painel/pedidos');
      revalidatePath('/painel/cardapio');
      revalidatePath('/painel/estoque');
      revalidatePath('/painel/mesas');
      revalidatePath('/painel/entrega');
      revalidatePath('/painel/caixa');
      revalidatePath('/painel/financeiro');
      if (atualizadaDb?.link) {
        revalidatePath(`/${atualizadaDb.link}`);
      }
    } catch {}

    // 6. Limpa a descrição para devolver o texto humano puro ao lojista
    const registroRetornado = atualizadaDb || {
      id: lojaId,
      ...payloadSupabase,
      descricao: descricaoParaSalvar,
      link: dadosLoja.link || 'lanchonete-do-ze',
      ativa: true,
      aberta: payloadSupabase.aberta ?? true,
      ultimo_numero_pedido: 0,
      criada_em: new Date().toISOString(),
    };

    const descricaoLimpa = (registroRetornado.descricao || '').replace(/<!--kodfood_meta:[\s\S]*?-->/, '').trim() || null;

    const lojaRetornada: Loja = {
      ...(registroRetornado as Loja),
      descricao: descricaoLimpa,
      chave_pix: metaEstendida.chave_pix ?? null,
      nome_titular_pix: metaEstendida.nome_titular_pix ?? null,
      mercado_pago_access_token: metaEstendida.mercado_pago_access_token ?? null,
      pix_automatico_ativo: !!metaEstendida.pix_automatico_ativo,
      senha_painel: metaEstendida.senha_painel ?? null,
    };

    return NextResponse.json({ sucesso: true, loja: lojaRetornada });
  } catch (err: any) {
    console.error('Exceção ao salvar loja:', err);
    return NextResponse.json({ erro: err?.message || 'Erro interno ao salvar loja' }, { status: 500 });
  }
}
