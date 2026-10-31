import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { Produto } from '@/tipos';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lojaId, dados } = body as {
      lojaId: string;
      dados: {
        id?: string;
        categoria_id: string | null;
        nome: string;
        descricao?: string | null;
        preco_centavos: number;
        foto_url?: string | null;
        disponivel?: boolean;
        controlar_estoque?: boolean;
        quantidade_estoque?: number;
        estoque_minimo?: number;
      };
    };

    if (!lojaId || !dados || !dados.nome) {
      return NextResponse.json({ erro: 'Dados incompletos para salvar produto' }, { status: 400 });
    }

    // 1. Garante lojaId UUID real
    let lojaRealId = lojaId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lojaRealId)) {
      lojaRealId = '11111111-1111-4111-8111-111111111111';
    }

    // 2. Resolve categoria_id para um UUID válido do Supabase
    let categoriaUuid: string | null = null;
    if (dados.categoria_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dados.categoria_id)) {
      categoriaUuid = dados.categoria_id;
    } else {
      // Mapeamento de IDs mock para UUIDs do Supabase
      const mapaMockParaUuid: Record<string, string> = {
        'cat-ze-1': '22222222-1111-4111-8111-111111111111',
        'cat-ze-2': '22222222-2222-4111-8111-111111111111',
        'cat-ze-3': '22222222-3333-4111-8111-111111111111',
      };

      if (dados.categoria_id && mapaMockParaUuid[dados.categoria_id]) {
        categoriaUuid = mapaMockParaUuid[dados.categoria_id];
      } else {
        // Busca a primeira categoria ativa da loja no Supabase
        const { data: catsDb } = await supabase
          .from('categorias')
          .select('id')
          .eq('loja_id', lojaRealId)
          .order('posicao')
          .limit(1);

        if (catsDb && catsDb.length > 0) {
          categoriaUuid = catsDb[0].id;
        }
      }
    }

    // 3. Monta payload compatível com as colunas reais da tabela produtos
    const payloadSupabase: Record<string, any> = {
      loja_id: lojaRealId,
      categoria_id: categoriaUuid,
      nome: dados.nome.trim(),
      descricao: dados.descricao?.trim() || null,
      preco_centavos: Math.max(0, dados.preco_centavos || 0),
      foto_url: dados.foto_url || null,
      disponivel: dados.disponivel !== undefined ? dados.disponivel : true,
    };

    let produtoSalvoDb: any = null;

    // Se possui ID em formato UUID, tenta atualizar
    const ehUuidProduto = dados.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dados.id);

    if (ehUuidProduto) {
      const { data: upDb, error: errUp } = await supabase
        .from('produtos')
        .update(payloadSupabase)
        .eq('id', dados.id)
        .select()
        .maybeSingle();

      if (!errUp && upDb) {
        produtoSalvoDb = upDb;
      }
    }

    // Se não tinha ID UUID ou a atualização não encontrou, insere como novo produto
    if (!produtoSalvoDb) {
      // Determina posição
      const { count } = await supabase
        .from('produtos')
        .select('*', { count: 'exact', head: true })
        .eq('loja_id', lojaRealId);

      payloadSupabase.posicao = (count || 0) + 1;

      const { data: insDb, error: errIns } = await supabase
        .from('produtos')
        .insert(payloadSupabase)
        .select()
        .single();

      if (errIns) {
        console.error('Erro ao inserir produto no Supabase:', errIns);
        return NextResponse.json({ erro: errIns.message }, { status: 500 });
      }

      produtoSalvoDb = insDb;
    }

    // 4. Invalidação de cache das rotas
    try {
      revalidatePath('/painel/cardapio');
      revalidatePath('/painel/estoque');
      revalidatePath('/painel/pedidos');
      revalidatePath('/[link]', 'page');
      revalidatePath('/lanchonete-do-ze');
    } catch {}

    const produtoRetornado: Produto = {
      id: produtoSalvoDb.id,
      loja_id: produtoSalvoDb.loja_id,
      categoria_id: produtoSalvoDb.categoria_id,
      nome: produtoSalvoDb.nome,
      descricao: produtoSalvoDb.descricao,
      preco_centavos: produtoSalvoDb.preco_centavos,
      foto_url: produtoSalvoDb.foto_url,
      disponivel: produtoSalvoDb.disponivel,
      posicao: produtoSalvoDb.posicao || 1,
      controlar_estoque: dados.controlar_estoque || false,
      quantidade_estoque: dados.quantidade_estoque || 0,
      estoque_minimo: dados.estoque_minimo || 5,
    };

    return NextResponse.json({ sucesso: true, produto: produtoRetornado });
  } catch (err: any) {
    console.error('Exceção ao salvar produto:', err);
    return NextResponse.json({ erro: err?.message || 'Erro interno ao salvar produto' }, { status: 500 });
  }
}
