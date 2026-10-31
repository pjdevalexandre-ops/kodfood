import {
  Loja,
  CardapioDaLoja,
  Categoria,
  Produto,
  GrupoDeAdicionais,
  Adicional,
  BairroAtendido,
  HorarioFuncionamento,
  DadosCriarPedido,
  RespostaCriarPedido,
  RespostaAcompanharPedido,
  Pedido,
  SituacaoPedido,
  PedidoItem,
  PedidoItemAdicional,
  FormaPagamento,
  SessaoCaixa,
  MovimentoCaixa,
  TipoMovimentoCaixa,
  ResumoFinanceiro,
  Mesa,
  StatusMesa,
  MovimentacaoEstoque,
  TipoMovimentacaoEstoque,
} from '@/tipos';
import { lojasExemplo, DadosCompletosLoja } from '@/dados-de-exemplo/lojas';
import { supabase } from '@/lib/supabase';

const CHAVE_STORAGE_PEDIDOS = 'kodfood_pedidos';
const CHAVE_STORAGE_LOJAS = 'kodfood_lojas_modificadas';

// Auxiliar para simular latência de rede realista
const aguardar = (ms: number = 60) => new Promise((resolve) => setTimeout(resolve, ms));

const pedidosIniciaisDemo: Pedido[] = [
  {
    id: 'ped-demo-1',
    loja_id: '11111111-1111-4111-8111-111111111111',
    numero: 17,
    cliente_id: 'cli-1',
    nome_cliente: 'Carlos Eduardo',
    telefone_cliente: '11988887777',
    tipo: 'entrega',
    situacao: 'em_preparo',
    forma_pagamento: 'pix',
    troco_para_centavos: null,
    bairro_id: 'bairro-ze-1',
    nome_do_bairro: 'Centro',
    rua: 'Rua das Flores',
    numero_casa: '250',
    complemento: 'Apto 12',
    referencia: 'Próximo à pracinha',
    subtotal_centavos: 2950,
    taxa_entrega_centavos: 500,
    total_centavos: 3450,
    observacao: 'Ponto da carne bem passado, por favor.',
    codigo_acompanhamento: 'e1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c',
    feito_em: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    atualizado_em: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    itens: [
      {
        id: 'item-demo-1',
        pedido_id: 'ped-demo-1',
        produto_id: 'prod-ze-2',
        nome_produto: 'X-Bacon Especial',
        preco_unitario_centavos: 2950,
        quantidade: 1,
        observacao: 'Sem cebola',
        adicionais: [
          {
            id: 'add-item-1',
            item_id: 'item-demo-1',
            adicional_id: 'add-ze-ponto-2',
            nome_adicional: 'Bem passado',
            preco_centavos: 0,
          },
        ],
      },
    ],
  },
];

let pedidosEmMemoriaServidor: Pedido[] = [...pedidosIniciaisDemo];
let lojasEmMemoriaServidor: Record<string, DadosCompletosLoja> = { ...lojasExemplo };

function obterLojasLocais(): Record<string, DadosCompletosLoja> {
  if (typeof window === 'undefined') {
    return lojasEmMemoriaServidor;
  }

  try {
    const salvos = localStorage.getItem(CHAVE_STORAGE_LOJAS);
    if (!salvos) return lojasEmMemoriaServidor;
    const modificacoes = JSON.parse(salvos);
    return { ...lojasEmMemoriaServidor, ...modificacoes };
  } catch {
    return lojasEmMemoriaServidor;
  }
}

function salvarLojasLocais(lojas: Record<string, DadosCompletosLoja>) {
  lojasEmMemoriaServidor = lojas;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHAVE_STORAGE_LOJAS, JSON.stringify(lojas));
  } catch (erro) {
    console.error('Falha ao salvar lojas no armazenamento local', erro);
  }
}

function obterPedidosArmazenados(): Pedido[] {
  if (typeof window === 'undefined') {
    return pedidosEmMemoriaServidor;
  }

  try {
    const dados = localStorage.getItem(CHAVE_STORAGE_PEDIDOS);
    if (!dados) {
      localStorage.setItem(CHAVE_STORAGE_PEDIDOS, JSON.stringify(pedidosIniciaisDemo));
      return pedidosIniciaisDemo;
    }
    const parsed = JSON.parse(dados);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return pedidosIniciaisDemo;
  } catch {
    return pedidosIniciaisDemo;
  }
}

function salvarPedidosArmazenados(pedidos: Pedido[]) {
  pedidosEmMemoriaServidor = pedidos;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHAVE_STORAGE_PEDIDOS, JSON.stringify(pedidos));
  } catch (erro) {
    console.error('Falha ao salvar pedidos no armazenamento local', erro);
  }
}

/**
 * Busca uma loja ativa pelo seu link amigável (slug da URL).
 */
export async function buscarLojaPeloLink(link: string): Promise<Loja | null> {
  const linkLimpo = link.trim().toLowerCase();
  const lojas = obterLojasLocais();
  const dadosLocais = lojas[linkLimpo] || Object.values(lojas).find((item) => item.loja.link === linkLimpo);

  // 1. Tenta carregar primeiro do Supabase
  try {
    const { data, error } = await supabase
      .from('lojas')
      .select('*')
      .eq('link', linkLimpo)
      .single();

    if (!error && data && data.ativa) {
      const lojaMesclada: Loja = {
        ...(dadosLocais?.loja || {}),
        ...(data as Loja),
        chave_pix: dadosLocais?.loja.chave_pix ?? (data as any).chave_pix ?? null,
        nome_titular_pix: dadosLocais?.loja.nome_titular_pix ?? (data as any).nome_titular_pix ?? null,
        mercado_pago_access_token: dadosLocais?.loja.mercado_pago_access_token ?? (data as any).mercado_pago_access_token ?? null,
        pix_automatico_ativo: dadosLocais?.loja.pix_automatico_ativo ?? (data as any).pix_automatico_ativo ?? false,
        senha_painel: dadosLocais?.loja.senha_painel ?? (data as any).senha_painel ?? null,
      };

      if (dadosLocais) {
        dadosLocais.loja = lojaMesclada;
        salvarLojasLocais(lojas);
      }

      return lojaMesclada;
    }
  } catch (err) {
    console.warn('Falha na consulta ao Supabase para buscarLojaPeloLink, usando fallback local', err);
  }

  // 2. Fallback para dados locais
  if (!dadosLocais || !dadosLocais.loja.ativa) {
    return null;
  }
  return dadosLocais.loja;
}

/**
 * Busca a loja pelo identificador flexível: link, slug, nome ou id.
 */
export async function buscarLojaPeloIdentificador(identificador: string): Promise<Loja | null> {
  const limpo = identificador.trim().toLowerCase();
  const slug = limpo.replace(/\s+/g, '-');
  const lojas = obterLojasLocais();
  const dadosLocais = lojas[slug] || lojas[limpo] || Object.values(lojas).find((item) => item.loja.link === slug || item.loja.link === limpo);

  // 1. Tenta buscar no Supabase
  try {
    const { data } = await supabase
      .from('lojas')
      .select('*')
      .or(`link.eq.${slug},link.eq.${limpo},nome.ilike.%${limpo}%`)
      .limit(1)
      .maybeSingle();

    if (data && data.ativa) {
      const lojaMesclada: Loja = {
        ...(dadosLocais?.loja || {}),
        ...(data as Loja),
        chave_pix: dadosLocais?.loja.chave_pix ?? (data as any).chave_pix ?? null,
        nome_titular_pix: dadosLocais?.loja.nome_titular_pix ?? (data as any).nome_titular_pix ?? null,
        mercado_pago_access_token: dadosLocais?.loja.mercado_pago_access_token ?? (data as any).mercado_pago_access_token ?? null,
        pix_automatico_ativo: dadosLocais?.loja.pix_automatico_ativo ?? (data as any).pix_automatico_ativo ?? false,
        senha_painel: dadosLocais?.loja.senha_painel ?? (data as any).senha_painel ?? null,
      };

      return lojaMesclada;
    }
  } catch {
    // Silencioso se cair no fallback
  }

  // 2. Fallback local por link, chave ou nome aproximado
  await aguardar();
  for (const chave of Object.keys(lojas)) {
    const l = lojas[chave]?.loja;
    if (!l || !l.ativa) continue;
    if (
      l.link.toLowerCase() === slug ||
      l.link.toLowerCase() === limpo ||
      chave.toLowerCase() === slug ||
      chave.toLowerCase() === limpo ||
      l.nome.toLowerCase().includes(limpo) ||
      limpo.includes(l.link.toLowerCase())
    ) {
      return l;
    }
  }

  return null;
}

/**
 * Retorna as categorias, produtos e adicionais disponíveis da loja.
 */
export async function listarCardapioDaLoja(lojaId: string): Promise<CardapioDaLoja | null> {
  // 1. Tenta buscar no Supabase
  try {
    const [resCategorias, resProdutos] = await Promise.all([
      supabase.from('categorias').select('*').eq('loja_id', lojaId).eq('ativa', true).order('posicao'),
      supabase.from('produtos').select('*').eq('loja_id', lojaId).eq('disponivel', true).order('posicao'),
    ]);

    if (!resCategorias.error && !resProdutos.error && resCategorias.data && resCategorias.data.length > 0) {
      return {
        categorias: resCategorias.data as Categoria[],
        produtos: resProdutos.data as Produto[],
        gruposDeAdicionais: [],
        produtoGrupos: [],
      };
    }
  } catch (err) {
    console.warn('Falha na consulta ao Supabase para listarCardapioDaLoja, usando fallback local', err);
  }

  // 2. Fallback para dados locais
  await aguardar();
  const lojas = obterLojasLocais();
  const encontrada = Object.values(lojas).find((item) => item.loja.id === lojaId);
  if (!encontrada) {
    return null;
  }

  return {
    categorias: encontrada.categorias.filter((cat) => cat.ativa).sort((a, b) => a.posicao - b.posicao),
    produtos: encontrada.produtos.filter((p) => p.disponivel).sort((a, b) => a.posicao - b.posicao),
    gruposDeAdicionais: encontrada.gruposDeAdicionais,
    produtoGrupos: encontrada.produtoGrupos,
  };
}

/**
 * Retorna a lista de bairros atendidos com taxa e prazo de entrega.
 */
export async function listarBairrosAtendidos(lojaId: string): Promise<BairroAtendido[]> {
  // 1. Tenta buscar do Supabase primeiro (IDs reais UUID)
  try {
    const { data, error } = await supabase
      .from('bairros_atendidos')
      .select('*')
      .eq('loja_id', lojaId)
      .eq('ativo', true)
      .order('nome');

    if (!error && data && data.length > 0) {
      return data as BairroAtendido[];
    }
  } catch {
    // Silencioso — usa fallback local
  }

  // 2. Fallback local (dados de exemplo)
  await aguardar();
  const lojas = obterLojasLocais();
  const encontrada = Object.values(lojas).find((item) => item.loja.id === lojaId);
  if (!encontrada) {
    return [];
  }

  return encontrada.bairros.filter((bairro) => bairro.ativo);
}

/**
 * Retorna os horários de funcionamento semanais da loja.
 */
export async function obterHorariosDaLoja(lojaId: string): Promise<HorarioFuncionamento[]> {
  await aguardar();
  const lojas = obterLojasLocais();
  const encontrada = Object.values(lojas).find((item) => item.loja.id === lojaId);
  if (!encontrada) {
    return [];
  }

  return encontrada.horarios;
}

/**
 * Cria o pedido, calculando todos os valores no código para refletir fielmente a função do banco.
 */
export async function criarPedido(dados: DadosCriarPedido): Promise<RespostaCriarPedido> {
  await aguardar();
  const lojas = obterLojasLocais();
  const encontrada = Object.values(lojas).find((item) => item.loja.id === dados.loja_id);

  if (!encontrada || !encontrada.loja.ativa) {
    throw new Error('Loja não encontrada.');
  }

  const { loja } = encontrada;

  if (!loja.aberta) {
    throw new Error('A loja está fechada no momento.');
  }

  if (dados.tipo === 'entrega' && !loja.aceita_entrega) {
    throw new Error('Esta loja não faz entregas.');
  }

  if (dados.tipo === 'retirada' && !loja.aceita_retirada) {
    throw new Error('Esta loja não tem retirada no balcão.');
  }

  if (!dados.nome.trim() || !dados.telefone.trim()) {
    throw new Error('Informe seu nome e telefone.');
  }

  if (!dados.itens || dados.itens.length === 0) {
    throw new Error('O pedido está sem itens.');
  }

  let taxaEntrega = 0;
  let bairroEncontrado: BairroAtendido | undefined;

  if (dados.tipo === 'entrega') {
    if (!dados.bairro_id) {
      throw new Error('Selecione o bairro para a entrega.');
    }
    bairroEncontrado = encontrada.bairros.find((b) => b.id === dados.bairro_id && b.ativo);
    if (!bairroEncontrado) {
      throw new Error('Esta loja não entrega nesse bairro.');
    }
    if (!dados.rua || !dados.rua.trim()) {
      throw new Error('Informe a rua para a entrega.');
    }
    taxaEntrega = bairroEncontrado.taxa_centavos;
  }

  // 1. TENTA GRAVAÇÃO ATÔMICA REAL VIA RPC NO SUPABASE
  const ehUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(loja.id);
  const itensSaoUuids = dados.itens.every((it) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(it.produto_id)
  );

  if (ehUuid && itensSaoUuids) {
    try {
      // Garante que o bairroId só vai se for UUID válido (evita IDs locais como 'bairro-ze-1')
      const ehBairroUuid = dados.bairro_id
        ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dados.bairro_id)
        : false;

      const payloadItens = dados.itens.map((it) => ({
        produto_id: it.produto_id,
        quantidade: it.quantidade,
        observacao: it.observacao?.trim() || null,
        adicionais: (it.adicionais || []).filter((addId) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(addId)
        ),
      }));

      const { data: rpcRes, error: rpcErr } = await supabase.rpc('criar_pedido', {
        p_loja_id: loja.id,
        p_nome: dados.nome.trim(),
        p_telefone: dados.telefone.trim(),
        p_tipo: dados.tipo,
        p_pagamento: dados.pagamento,
        p_itens: payloadItens,
        p_bairro_id: ehBairroUuid ? dados.bairro_id : null,
        p_rua: dados.rua?.trim() || null,
        p_numero_casa: dados.numero_casa?.trim() || null,
        p_complemento: dados.complemento?.trim() || null,
        p_referencia: dados.referencia?.trim() || null,
        p_troco_para_centavos: dados.pagamento === 'dinheiro' ? dados.troco_para_centavos || null : null,
        p_observacao: dados.observacao?.trim() || null,
      });

      if (!rpcErr && rpcRes) {
        const agora = new Date().toISOString();
        const pedidoCriado: Pedido = {
          id: rpcRes.pedido_id,
          loja_id: loja.id,
          numero: rpcRes.numero,
          cliente_id: 'cli-supabase',
          nome_cliente: dados.nome.trim(),
          telefone_cliente: dados.telefone.trim(),
          tipo: dados.tipo,
          situacao: 'recebido',
          forma_pagamento: dados.pagamento,
          troco_para_centavos: dados.troco_para_centavos || null,
          bairro_id: dados.bairro_id || null,
          nome_do_bairro: bairroEncontrado?.nome || null,
          rua: dados.rua || null,
          numero_casa: dados.numero_casa || null,
          complemento: dados.complemento || null,
          referencia: dados.referencia || null,
          subtotal_centavos: rpcRes.total_centavos - taxaEntrega,
          taxa_entrega_centavos: taxaEntrega,
          total_centavos: rpcRes.total_centavos,
          observacao: dados.observacao || null,
          codigo_acompanhamento: rpcRes.codigo_acompanhamento,
          feito_em: agora,
          atualizado_em: agora,
          itens: [],
        };

        const listaAtual = obterPedidosArmazenados();
        salvarPedidosArmazenados([pedidoCriado, ...listaAtual]);

        return {
          pedido_id: rpcRes.pedido_id,
          numero: rpcRes.numero,
          codigo_acompanhamento: rpcRes.codigo_acompanhamento,
          total_centavos: rpcRes.total_centavos,
        };
      } else if (rpcErr && rpcErr.message && !rpcErr.message.includes('fetch failed')) {
        throw new Error(rpcErr.message);
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch failed')) {
        throw err;
      }
    }
  }

  // Montagem dos itens e cálculo rigoroso dos valores em centavos (Fallback Local)
  let subtotal = 0;
  const idDoPedido = 'ped-' + Math.random().toString(36).substring(2, 11);
  const itensProcessados: PedidoItem[] = [];

  for (const itemEntrada of dados.itens) {
    if (!itemEntrada.quantidade || itemEntrada.quantidade < 1 || itemEntrada.quantidade > 50) {
      throw new Error('Quantidade inválida em um dos itens.');
    }

    // Busca o produto pelo ID em encontrada.produtos (pode ser ID local 'prod-ze-1' ou UUID do Supabase)
    let produtoOriginal = encontrada.produtos.find(
      (p) => p.id === itemEntrada.produto_id && p.disponivel
    );

    // Se o produto veio do Supabase e não foi achado pelo ID exato no array estático, busca em Supabase ou local
    if (!produtoOriginal) {
      // 1. Tenta buscar em Supabase
      try {
        const { data: prodDb } = await supabase
          .from('produtos')
          .select('*')
          .eq('id', itemEntrada.produto_id)
          .eq('disponivel', true)
          .maybeSingle();

        if (prodDb) {
          produtoOriginal = {
            id: prodDb.id,
            loja_id: prodDb.loja_id,
            categoria_id: prodDb.categoria_id,
            nome: prodDb.nome,
            descricao: prodDb.descricao,
            preco_centavos: prodDb.preco_centavos,
            foto_url: prodDb.foto_url,
            disponivel: prodDb.disponivel,
            posicao: prodDb.posicao || 1,
          };
        }
      } catch {}
    }

    // Se ainda assim não achou, faz busca tolerante por nome se o produto foi espelhado
    if (!produtoOriginal) {
      produtoOriginal = encontrada.produtos.find(
        (p) => p.disponivel && (p.id === itemEntrada.produto_id)
      );
    }

    if (!produtoOriginal) {
      throw new Error('Um dos produtos não está mais disponível.');
    }

    const itemId = 'item-' + Math.random().toString(36).substring(2, 11);
    let somaAdicionais = 0;
    const adicionaisDoItem: PedidoItemAdicional[] = [];

    if (itemEntrada.adicionais && itemEntrada.adicionais.length > 0) {
      // Localiza todos os grupos vinculados ao produto
      const gruposIdsDoProduto = encontrada.produtoGrupos
        .filter((pg) => pg.produto_id === produtoOriginal.id)
        .map((pg) => pg.grupo_id);

      for (const idAdicional of itemEntrada.adicionais) {
        let adicionalAchado = null;
        for (const grupo of encontrada.gruposDeAdicionais) {
          if (gruposIdsDoProduto.includes(grupo.id)) {
            const achado = grupo.adicionais?.find((a) => a.id === idAdicional && a.disponivel);
            if (achado) {
              adicionalAchado = achado;
              break;
            }
          }
        }

        if (!adicionalAchado) {
          throw new Error('Um dos adicionais não está disponível.');
        }

        somaAdicionais += adicionalAchado.preco_centavos;
        adicionaisDoItem.push({
          id: 'add-item-' + Math.random().toString(36).substring(2, 9),
          item_id: itemId,
          adicional_id: adicionalAchado.id,
          nome_adicional: adicionalAchado.nome,
          preco_centavos: adicionalAchado.preco_centavos,
        });
      }
    }

    const precoLinha = (produtoOriginal.preco_centavos + somaAdicionais) * itemEntrada.quantidade;
    subtotal += precoLinha;

    itensProcessados.push({
      id: itemId,
      pedido_id: idDoPedido,
      produto_id: produtoOriginal.id,
      nome_produto: produtoOriginal.nome,
      preco_unitario_centavos: produtoOriginal.preco_centavos,
      quantidade: itemEntrada.quantidade,
      observacao: itemEntrada.observacao?.trim() || null,
      adicionais: adicionaisDoItem,
    });
  }

  if (subtotal < loja.pedido_minimo_centavos) {
    throw new Error('O pedido está abaixo do valor mínimo da loja.');
  }

  const total = subtotal + taxaEntrega;

  if (dados.pagamento === 'dinheiro' && dados.troco_para_centavos != null && dados.troco_para_centavos < total) {
    throw new Error('O valor informado para troco é menor que o total do pedido.');
  }

  // Atualiza número do pedido na loja
  const proximoNumero = (loja.ultimo_numero_pedido || 0) + 1;
  loja.ultimo_numero_pedido = proximoNumero;
  salvarLojasLocais(lojas);

  const codigoAcompanhamento = 'ped-' + Math.random().toString(36).substring(2, 8) + '-' + Date.now().toString(36);
  const agora = new Date().toISOString();

  const novoPedido: Pedido = {
    id: idDoPedido,
    loja_id: loja.id,
    numero: proximoNumero,
    cliente_id: 'cli-' + Math.random().toString(36).substring(2, 8),
    nome_cliente: dados.nome.trim(),
    telefone_cliente: dados.telefone.trim(),
    tipo: dados.tipo,
    situacao: 'recebido',
    forma_pagamento: dados.pagamento,
    troco_para_centavos: dados.pagamento === 'dinheiro' ? dados.troco_para_centavos || null : null,
    bairro_id: dados.bairro_id || null,
    nome_do_bairro: bairroEncontrado?.nome || null,
    rua: dados.rua?.trim() || null,
    numero_casa: dados.numero_casa?.trim() || null,
    complemento: dados.complemento?.trim() || null,
    referencia: dados.referencia?.trim() || null,
    subtotal_centavos: subtotal,
    taxa_entrega_centavos: taxaEntrega,
    total_centavos: total,
    observacao: dados.observacao?.trim() || null,
    codigo_acompanhamento: codigoAcompanhamento,
    feito_em: agora,
    atualizado_em: agora,
    itens: itensProcessados,
  };

  const listaAtual = obterPedidosArmazenados();
  salvarPedidosArmazenados([novoPedido, ...listaAtual]);

  // Sincroniza com a API do servidor e Supabase em nuvem
  if (typeof window !== 'undefined') {
    fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoPedido),
    }).catch((err) => console.warn('Erro ao sincronizar pedido com o servidor:', err));

    // Salva o pedido diretamente no Supabase para acompanhamento compartilhado em tempo real
    supabase
      .from('pedidos')
      .insert({
        loja_id: loja.id,
        numero: proximoNumero,
        nome_cliente: dados.nome.trim(),
        telefone_cliente: dados.telefone.trim(),
        tipo: dados.tipo,
        situacao: 'recebido',
        forma_pagamento: dados.pagamento,
        troco_para_centavos: dados.pagamento === 'dinheiro' ? dados.troco_para_centavos || null : null,
        bairro_id: dados.bairro_id || null,
        nome_do_bairro: bairroEncontrado?.nome || null,
        rua: dados.rua?.trim() || null,
        numero_casa: dados.numero_casa?.trim() || null,
        complemento: dados.complemento?.trim() || null,
        referencia: dados.referencia?.trim() || null,
        subtotal_centavos: subtotal,
        taxa_entrega_centavos: taxaEntrega,
        total_centavos: total,
        observacao: dados.observacao?.trim() || null,
        codigo_acompanhamento: codigoAcompanhamento,
      })
      .then(({ error }) => {
        if (error) console.warn('Aviso: falha ao espelhar pedido no Supabase', error);
      });
  }

  // Baixa automática no estoque para produtos com controle ativo
  darBaixaEstoquePedido(loja.id, novoPedido);

  return {
    pedido_id: idDoPedido,
    numero: proximoNumero,
    codigo_acompanhamento: codigoAcompanhamento,
    total_centavos: total,
  };
}

/**
 * Consulta o andamento de um pedido pelo seu código público de acompanhamento.
 */
export async function acompanharPedido(codigo: string): Promise<RespostaAcompanharPedido | null> {
  await aguardar();

  // 1. Tenta buscar o status mais atualizado direto no Supabase
  try {
    const { data: doSupabase } = await supabase
      .from('pedidos')
      .select(`
        *,
        lojas ( nome, link, telefone_whatsapp, cor_principal, endereco ),
        pedido_itens (
          id, nome_produto, quantidade, preco_unitario_centavos, observacao,
          pedido_item_adicionais ( id, nome_adicional, preco_centavos )
        )
      `)
      .eq('codigo_acompanhamento', codigo)
      .maybeSingle();

    if (doSupabase) {
      const dadosLoja: any = doSupabase.lojas;

      let pixCopia = doSupabase.pix_copia_e_cola || null;
      let pixQr = doSupabase.pix_qr_code_base64 || null;
      let pixExp = doSupabase.pix_expira_em || null;
      let pixPago = !!doSupabase.pix_pago;

      // Se não veio em coluna dedicada, extrai do JSON de referencia
      if (!pixCopia && doSupabase.referencia && doSupabase.referencia.startsWith('{')) {
        try {
          const parsed = JSON.parse(doSupabase.referencia);
          if (parsed.tipo === 'pix_mercado_pago' || parsed.copia_e_cola) {
            pixCopia = parsed.copia_e_cola || null;
            pixQr = parsed.qr_code_base64 || null;
            pixExp = parsed.expira_em || null;
            pixPago = !!parsed.pago;
          }
        } catch {}
      }

      return {
        numero: doSupabase.numero,
        situacao: doSupabase.situacao as SituacaoPedido,
        tipo: doSupabase.tipo,
        subtotal_centavos: doSupabase.subtotal_centavos,
        taxa_entrega_centavos: doSupabase.taxa_entrega_centavos,
        total_centavos: doSupabase.total_centavos,
        forma_pagamento: doSupabase.forma_pagamento,
        troco_para_centavos: doSupabase.troco_para_centavos,
        feito_em: doSupabase.feito_em,
        pix_copia_e_cola: pixCopia,
        pix_qr_code_base64: pixQr,
        pix_expira_em: pixExp,
        pix_pago: pixPago,
        endereco_entrega:
          doSupabase.tipo === 'entrega'
            ? {
                bairro: doSupabase.nome_do_bairro,
                rua: doSupabase.rua,
                numero: doSupabase.numero_casa,
                complemento: doSupabase.complemento,
                referencia: doSupabase.referencia,
              }
            : null,
        loja: {
          nome: dadosLoja?.nome || 'Lanchonete',
          link: dadosLoja?.link || '',
          telefone_whatsapp: dadosLoja?.telefone_whatsapp || null,
          cor_principal: dadosLoja?.cor_principal || '#B4412B',
          endereco: dadosLoja?.endereco || null,
        },
        itens: (doSupabase.pedido_itens || []).map((i: any) => ({
          nome: i.nome_produto,
          quantidade: i.quantidade,
          preco_unitario_centavos: i.preco_unitario_centavos,
          observacao: i.observacao,
          adicionais: (i.pedido_item_adicionais || []).map((a: any) => ({
            nome: a.nome_adicional,
            preco_centavos: a.preco_centavos,
          })),
        })),
      };
    }
  } catch (err) {
    console.warn('Falha ao consultar status no Supabase, tentando fallback local:', err);
  }

  // 2. Fallback de API se não encontrou no Supabase
  let pedido = obterPedidosArmazenados().find((p) => p.codigo_acompanhamento === codigo);

  if (!pedido && typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/pedidos/acompanhar/${codigo}`);
      if (res.ok) {
        const atualizado = await res.json();
        if (atualizado) {
          pedido = atualizado;
          const pedidosLocais = obterPedidosArmazenados();
          salvarPedidosArmazenados([atualizado, ...pedidosLocais.filter((p) => p.codigo_acompanhamento !== codigo)]);
        }
      }
    } catch {}
  }

  if (!pedido) {
    return null;
  }

  const lojas = obterLojasLocais();
  const encontrada = Object.values(lojas).find((l) => l.loja.id === pedido.loja_id);

  return {
    numero: pedido.numero,
    situacao: pedido.situacao,
    tipo: pedido.tipo,
    subtotal_centavos: pedido.subtotal_centavos,
    taxa_entrega_centavos: pedido.taxa_entrega_centavos,
    total_centavos: pedido.total_centavos,
    forma_pagamento: pedido.forma_pagamento,
    troco_para_centavos: pedido.troco_para_centavos,
    feito_em: pedido.feito_em,
    pix_copia_e_cola: pedido.pix_copia_e_cola || null,
    pix_qr_code_base64: pedido.pix_qr_code_base64 || null,
    pix_expira_em: pedido.pix_expira_em || null,
    pix_pago: pedido.pix_pago || false,
    endereco_entrega:
      pedido.tipo === 'entrega'
        ? {
            bairro: pedido.nome_do_bairro,
            rua: pedido.rua,
            numero: pedido.numero_casa,
            complemento: pedido.complemento,
            referencia: pedido.referencia,
          }
        : null,
    loja: {
      nome: encontrada?.loja.nome || 'Lanchonete',
      link: encontrada?.loja.link || '',
      telefone_whatsapp: encontrada?.loja.telefone_whatsapp || null,
      cor_principal: encontrada?.loja.cor_principal || '#B4412B',
      endereco: encontrada?.loja.endereco || null,
    },
    itens: (pedido.itens || []).map((i) => ({
      nome: i.nome_produto,
      quantidade: i.quantidade,
      preco_unitario_centavos: i.preco_unitario_centavos,
      observacao: i.observacao,
      adicionais: (i.adicionais || []).map((a) => ({
        nome: a.nome_adicional,
        preco_centavos: a.preco_centavos,
      })),
    })),
  };
}

/**
 * Lista todos os pedidos de uma loja para o painel em tempo real.
 */
export async function listarPedidosDoPainel(lojaId: string): Promise<Pedido[]> {
  await aguardar();

  // 1. Tenta buscar pedidos reais do Supabase
  try {
    const { data: pedidosDb, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        pedido_itens (
          id, pedido_id, produto_id, nome_produto, preco_unitario_centavos, quantidade, observacao,
          pedido_item_adicionais (
            id, item_id, adicional_id, nome_adicional, preco_centavos
          )
        )
      `)
      .eq('loja_id', lojaId)
      .order('feito_em', { ascending: false });

    if (!error && Array.isArray(pedidosDb)) {
      const pedidosFormatados: Pedido[] = pedidosDb.map((p: any) => ({
        id: p.id,
        loja_id: p.loja_id,
        numero: p.numero,
        cliente_id: p.cliente_id || 'cli-supabase',
        nome_cliente: p.nome_cliente,
        telefone_cliente: p.telefone_cliente,
        tipo: p.tipo,
        situacao: p.situacao as SituacaoPedido,
        forma_pagamento: p.forma_pagamento,
        troco_para_centavos: p.troco_para_centavos,
        bairro_id: p.bairro_id,
        nome_do_bairro: p.nome_do_bairro,
        rua: p.rua,
        numero_casa: p.numero_casa,
        complemento: p.complemento,
        referencia: p.referencia,
        subtotal_centavos: p.subtotal_centavos,
        taxa_entrega_centavos: p.taxa_entrega_centavos,
        total_centavos: p.total_centavos,
        observacao: p.observacao,
        codigo_acompanhamento: p.codigo_acompanhamento,
        feito_em: p.feito_em,
        atualizado_em: p.atualizado_em,
        itens: (p.pedido_itens || []).map((item: any) => ({
          id: item.id,
          pedido_id: item.pedido_id,
          produto_id: item.produto_id,
          nome_produto: item.nome_produto,
          preco_unitario_centavos: item.preco_unitario_centavos,
          quantidade: item.quantidade,
          observacao: item.observacao,
          adicionais: (item.pedido_item_adicionais || []).map((add: any) => ({
            id: add.id,
            item_id: add.item_id,
            adicional_id: add.adicional_id,
            nome_adicional: add.nome_adicional,
            preco_centavos: add.preco_centavos,
          })),
        })),
      }));

      if (typeof window !== 'undefined') {
        const outros = obterPedidosArmazenados().filter((p) => p.loja_id !== lojaId);
        salvarPedidosArmazenados([...pedidosFormatados, ...outros]);
      }

      return pedidosFormatados;
    }
  } catch (err) {
    console.warn('Busca no Supabase falhou, usando armazenamento local:', err);
  }

  // 2. Fallback de API interna
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/pedidos?loja_id=${lojaId}`);
      if (res.ok) {
        const daApi: Pedido[] = await res.json();
        if (Array.isArray(daApi)) {
          const locais = obterPedidosArmazenados();
          const mapa = new Map<string, Pedido>();
          locais.forEach((p) => mapa.set(p.id, p));
          daApi.forEach((p) => mapa.set(p.id, p));
          const mesclados = Array.from(mapa.values()).sort(
            (a, b) => new Date(b.feito_em).getTime() - new Date(a.feito_em).getTime()
          );
          salvarPedidosArmazenados(mesclados);
          return mesclados.filter((p) => p.loja_id === lojaId);
        }
      }
    } catch {}
  }

  const pedidos = obterPedidosArmazenados();
  return pedidos.filter((p) => p.loja_id === lojaId);
}

/**
 * Altera a situação do pedido (avanço de etapa ou cancelamento no painel).
 */
export async function mudarSituacaoDoPedido(pedidoId: string, situacao: SituacaoPedido): Promise<Pedido> {
  await aguardar();
  const agora = new Date().toISOString();

  // 1. Atualiza no Supabase direto por ID
  try {
    await supabase
      .from('pedidos')
      .update({
        situacao,
        atualizado_em: agora,
      })
      .eq('id', pedidoId);
  } catch (err) {
    console.warn('Aviso: falha ao atualizar pedido no Supabase por ID:', err);
  }

  const pedidos = obterPedidosArmazenados();
  const indice = pedidos.findIndex((p) => p.id === pedidoId);
  let situacaoAnterior: SituacaoPedido | null = null;
  let atualizado: Pedido;

  if (indice !== -1) {
    situacaoAnterior = pedidos[indice].situacao;
    atualizado = {
      ...pedidos[indice],
      situacao,
      atualizado_em: agora,
    };
    pedidos[indice] = atualizado;
    salvarPedidosArmazenados(pedidos);
  } else {
    atualizado = {
      id: pedidoId,
      loja_id: '',
      numero: 0,
      cliente_id: '',
      nome_cliente: '',
      telefone_cliente: '',
      tipo: 'retirada',
      situacao,
      forma_pagamento: 'pix',
      troco_para_centavos: null,
      bairro_id: null,
      nome_do_bairro: null,
      rua: null,
      numero_casa: null,
      complemento: null,
      referencia: null,
      subtotal_centavos: 0,
      taxa_entrega_centavos: 0,
      total_centavos: 0,
      observacao: null,
      codigo_acompanhamento: '',
      feito_em: agora,
      atualizado_em: agora,
      itens: [],
    };
  }

  if (typeof window !== 'undefined') {
    fetch(`/api/pedidos/${pedidoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ situacao }),
    }).catch(() => {});

    // Sincroniza também por código de acompanhamento no Supabase
    if (atualizado.codigo_acompanhamento) {
      supabase
        .from('pedidos')
        .update({
          situacao,
          atualizado_em: agora,
        })
        .eq('codigo_acompanhamento', atualizado.codigo_acompanhamento)
        .then(null, () => {});
    }
  }

  // Se o pedido foi cancelado, estorna os itens de volta ao estoque
  if (situacao === 'cancelado' && situacaoAnterior !== 'cancelado' && atualizado.loja_id) {
    estornarEstoquePedido(atualizado.loja_id, atualizado);
  }

  return atualizado;
}

/**
 * Alterna se a loja está aberta ou fechada para receber novos pedidos.
 */
export async function alternarStatusAbertaLoja(lojaId: string, aberta: boolean): Promise<Loja> {
  await aguardar();
  const lojas = obterLojasLocais();
  const chave = Object.keys(lojas).find((k) => lojas[k].loja.id === lojaId);
  if (!chave) {
    throw new Error('Loja não encontrada.');
  }

  lojas[chave].loja.aberta = aberta;
  salvarLojasLocais(lojas);

  // Sincroniza status aberto/fechado em nuvem no Supabase
  try {
    await supabase.from('lojas').update({ aberta }).eq('id', lojaId);
  } catch (err) {
    console.warn('Falha ao sincronizar status da loja no Supabase', err);
  }

  return lojas[chave].loja;
}

/**
 * Retorna todos os dados de cardápio da loja para edição no painel (incluindo itens indisponíveis).
 */
export async function obterCardapioCompletoParaPainel(lojaId: string): Promise<DadosCompletosLoja | null> {
  await aguardar();
  const lojas = obterLojasLocais();
  const encontrada = Object.values(lojas).find((k) => k.loja.id === lojaId);
  if (!encontrada) return null;
  return JSON.parse(JSON.stringify(encontrada));
}

/**
 * Ativa ou desativa um produto ("Em falta hoje").
 */
export async function alternarDisponibilidadeProduto(
  lojaId: string,
  produtoId: string,
  disponivel: boolean
): Promise<Produto> {
  await aguardar();
  const lojas = obterLojasLocais();
  const chave = Object.keys(lojas).find((k) => lojas[k].loja.id === lojaId);
  if (!chave) throw new Error('Loja não encontrada.');

  const produto = lojas[chave].produtos.find((p) => p.id === produtoId);
  if (!produto) throw new Error('Produto não encontrado.');

  produto.disponivel = disponivel;
  salvarLojasLocais(lojas);
  return produto;
}

/**
 * Cria ou edita um produto no cardápio.
 */
export async function salvarProduto(
  lojaId: string,
  dados: {
    id?: string;
    categoria_id: string | null;
    nome: string;
    descricao?: string | null;
    preco_centavos: number;
    foto_url?: string | null;
    disponivel?: boolean;
    gruposIds?: string[];
    controlar_estoque?: boolean;
    quantidade_estoque?: number;
    estoque_minimo?: number;
  }
): Promise<Produto> {
  await aguardar();
  const lojas = obterLojasLocais();
  const chave = Object.keys(lojas).find((k) => lojas[k].loja.id === lojaId);
  if (!chave) throw new Error('Loja não encontrada.');

  const lojaDados = lojas[chave];
  let produtoFinal: Produto;

  if (dados.id) {
    // Edição
    const idx = lojaDados.produtos.findIndex((p) => p.id === dados.id);
    if (idx === -1) throw new Error('Produto não encontrado para edição.');

    produtoFinal = {
      ...lojaDados.produtos[idx],
      categoria_id: dados.categoria_id,
      nome: dados.nome.trim(),
      descricao: dados.descricao?.trim() || null,
      preco_centavos: dados.preco_centavos,
      foto_url: dados.foto_url !== undefined ? dados.foto_url : lojaDados.produtos[idx].foto_url,
      disponivel: dados.disponivel !== undefined ? dados.disponivel : lojaDados.produtos[idx].disponivel,
      controlar_estoque: dados.controlar_estoque !== undefined ? dados.controlar_estoque : lojaDados.produtos[idx].controlar_estoque,
      quantidade_estoque: dados.quantidade_estoque !== undefined ? dados.quantidade_estoque : lojaDados.produtos[idx].quantidade_estoque,
      estoque_minimo: dados.estoque_minimo !== undefined ? dados.estoque_minimo : lojaDados.produtos[idx].estoque_minimo,
    };
    lojaDados.produtos[idx] = produtoFinal;
  } else {
    // Criação
    const novoId = 'prod-' + Math.random().toString(36).substring(2, 9);
    const proximaPosicao =
      lojaDados.produtos.filter((p) => p.categoria_id === dados.categoria_id).length + 1;

    produtoFinal = {
      id: novoId,
      loja_id: lojaId,
      categoria_id: dados.categoria_id,
      nome: dados.nome.trim(),
      descricao: dados.descricao?.trim() || null,
      preco_centavos: dados.preco_centavos,
      foto_url: dados.foto_url || null,
      disponivel: dados.disponivel !== undefined ? dados.disponivel : true,
      posicao: proximaPosicao,
      controlar_estoque: dados.controlar_estoque || false,
      quantidade_estoque: dados.quantidade_estoque || 0,
      estoque_minimo: dados.estoque_minimo || 5,
    };
    lojaDados.produtos.push(produtoFinal);
  }

  // Atualiza vínculos de grupos de adicionais
  if (dados.gruposIds) {
    lojaDados.produtoGrupos = lojaDados.produtoGrupos.filter(
      (pg) => pg.produto_id !== produtoFinal.id
    );
    for (const grupoId of dados.gruposIds) {
      lojaDados.produtoGrupos.push({
        loja_id: lojaId,
        produto_id: produtoFinal.id,
        grupo_id: grupoId,
      });
    }
  }

  salvarLojasLocais(lojas);

  // Sincroniza em nuvem no Supabase em segundo plano
  try {
    if (dados.id) {
      await supabase.from('produtos').update({
        categoria_id: dados.categoria_id,
        nome: produtoFinal.nome,
        descricao: produtoFinal.descricao,
        preco_centavos: produtoFinal.preco_centavos,
        foto_url: produtoFinal.foto_url,
        disponivel: produtoFinal.disponivel,
      }).eq('id', dados.id);
    } else {
      await supabase.from('produtos').insert({
        loja_id: lojaId,
        categoria_id: dados.categoria_id,
        nome: produtoFinal.nome,
        descricao: produtoFinal.descricao,
        preco_centavos: produtoFinal.preco_centavos,
        foto_url: produtoFinal.foto_url,
        disponivel: produtoFinal.disponivel,
        posicao: produtoFinal.posicao,
      });
    }
  } catch (err) {
    console.warn('Falha na sincronização do produto com Supabase', err);
  }

  return produtoFinal;
}

/**
 * Exclui um produto do cardápio.
 */
export async function excluirProduto(lojaId: string, produtoId: string): Promise<void> {
  await aguardar();
  const lojas = obterLojasLocais();
  const chave = Object.keys(lojas).find((k) => lojas[k].loja.id === lojaId);
  if (!chave) throw new Error('Loja não encontrada.');

  lojas[chave].produtos = lojas[chave].produtos.filter((p) => p.id !== produtoId);
  lojas[chave].produtoGrupos = lojas[chave].produtoGrupos.filter((pg) => pg.produto_id !== produtoId);
  salvarLojasLocais(lojas);

  try {
    await supabase.from('produtos').delete().eq('id', produtoId);
  } catch (err) {
    console.warn('Falha ao excluir produto no Supabase', err);
  }
}

/**
 * Reordena os produtos de uma categoria.
 */
export async function reordenarProdutos(
  lojaId: string,
  categoriaId: string,
  direcao: 'subir' | 'descer',
  produtoId: string
): Promise<void> {
  await aguardar();
  const lojas = obterLojasLocais();
  const chave = Object.keys(lojas).find((k) => lojas[k].loja.id === lojaId);
  if (!chave) throw new Error('Loja não encontrada.');

  const produtosDaCat = lojas[chave].produtos
    .filter((p) => p.categoria_id === categoriaId)
    .sort((a, b) => a.posicao - b.posicao);

  const idx = produtosDaCat.findIndex((p) => p.id === produtoId);
  if (idx === -1) return;

  const alvoIdx = direcao === 'subir' ? idx - 1 : idx + 1;
  if (alvoIdx < 0 || alvoIdx >= produtosDaCat.length) return;

  // Troca posições
  const temp = produtosDaCat[idx].posicao;
  produtosDaCat[idx].posicao = produtosDaCat[alvoIdx].posicao;
  produtosDaCat[alvoIdx].posicao = temp;

  salvarLojasLocais(lojas);
}

/**
 * Cria ou edita uma categoria.
 */
export async function salvarCategoria(
  lojaId: string,
  dados: { id?: string; nome: string }
): Promise<Categoria> {
  await aguardar();
  const lojas = obterLojasLocais();
  const chave = Object.keys(lojas).find((k) => lojas[k].loja.id === lojaId);
  if (!chave) throw new Error('Loja não encontrada.');

  const lojaDados = lojas[chave];
  let catFinal: Categoria;

  if (dados.id) {
    const idx = lojaDados.categorias.findIndex((c) => c.id === dados.id);
    if (idx === -1) throw new Error('Categoria não encontrada.');
    catFinal = { ...lojaDados.categorias[idx], nome: dados.nome.trim() };
    lojaDados.categorias[idx] = catFinal;
  } else {
    const novoId = 'cat-' + Math.random().toString(36).substring(2, 9);
    catFinal = {
      id: novoId,
      loja_id: lojaId,
      nome: dados.nome.trim(),
      posicao: lojaDados.categorias.length + 1,
      ativa: true,
    };
    lojaDados.categorias.push(catFinal);
  }

  salvarLojasLocais(lojas);
  return catFinal;
}

/**
 * Exclui uma categoria.
 */
export async function excluirCategoria(lojaId: string, categoriaId: string): Promise<void> {
  await aguardar();
  const lojas = obterLojasLocais();
  const chave = Object.keys(lojas).find((k) => lojas[k].loja.id === lojaId);
  if (!chave) throw new Error('Loja não encontrada.');

  lojas[chave].categorias = lojas[chave].categorias.filter((c) => c.id !== categoriaId);
  // Desassocia produtos da categoria
  lojas[chave].produtos = lojas[chave].produtos.map((p) =>
    p.categoria_id === categoriaId ? { ...p, categoria_id: null } : p
  );

  salvarLojasLocais(lojas);
}

/**
 * Cria ou edita um grupo de adicionais.
 */
export async function salvarGrupoDeAdicionais(
  lojaId: string,
  dados: { id?: string; nome: string; minimo: number; maximo: number }
): Promise<GrupoDeAdicionais> {
  await aguardar();
  const lojas = obterLojasLocais();
  const chave = Object.keys(lojas).find((k) => lojas[k].loja.id === lojaId);
  if (!chave) throw new Error('Loja não encontrada.');

  const lojaDados = lojas[chave];
  let grupoFinal: GrupoDeAdicionais;

  if (dados.id) {
    const idx = lojaDados.gruposDeAdicionais.findIndex((g) => g.id === dados.id);
    if (idx === -1) throw new Error('Grupo não encontrado.');
    grupoFinal = {
      ...lojaDados.gruposDeAdicionais[idx],
      nome: dados.nome.trim(),
      minimo: dados.minimo,
      maximo: dados.maximo,
    };
    lojaDados.gruposDeAdicionais[idx] = grupoFinal;
  } else {
    const novoId = 'grp-' + Math.random().toString(36).substring(2, 9);
    grupoFinal = {
      id: novoId,
      loja_id: lojaId,
      nome: dados.nome.trim(),
      minimo: dados.minimo,
      maximo: dados.maximo,
      adicionais: [],
    };
    lojaDados.gruposDeAdicionais.push(grupoFinal);
  }

  salvarLojasLocais(lojas);
  return grupoFinal;
}

/**
 * Exclui um grupo de adicionais.
 */
export async function excluirGrupoDeAdicionais(lojaId: string, grupoId: string): Promise<void> {
  await aguardar();
  const lojas = obterLojasLocais();
  const chave = Object.keys(lojas).find((k) => lojas[k].loja.id === lojaId);
  if (!chave) throw new Error('Loja não encontrada.');

  lojas[chave].gruposDeAdicionais = lojas[chave].gruposDeAdicionais.filter((g) => g.id !== grupoId);
  lojas[chave].produtoGrupos = lojas[chave].produtoGrupos.filter((pg) => pg.grupo_id !== grupoId);
  salvarLojasLocais(lojas);
}

/**
 * Cria ou edita um adicional dentro de um grupo.
 */
export async function salvarAdicional(
  lojaId: string,
  grupoId: string,
  dados: { id?: string; nome: string; preco_centavos: number; disponivel?: boolean }
): Promise<Adicional> {
  await aguardar();
  const lojas = obterLojasLocais();
  const chave = Object.keys(lojas).find((k) => lojas[k].loja.id === lojaId);
  if (!chave) throw new Error('Loja não encontrada.');

  const grupo = lojas[chave].gruposDeAdicionais.find((g) => g.id === grupoId);
  if (!grupo) throw new Error('Grupo não encontrado.');

  if (!grupo.adicionais) grupo.adicionais = [];

  let adFinal: Adicional;
  if (dados.id) {
    const idx = grupo.adicionais.findIndex((a) => a.id === dados.id);
    if (idx === -1) throw new Error('Adicional não encontrado.');
    adFinal = {
      ...grupo.adicionais[idx],
      nome: dados.nome.trim(),
      preco_centavos: dados.preco_centavos,
      disponivel: dados.disponivel !== undefined ? dados.disponivel : grupo.adicionais[idx].disponivel,
    };
    grupo.adicionais[idx] = adFinal;
  } else {
    const novoId = 'add-' + Math.random().toString(36).substring(2, 9);
    adFinal = {
      id: novoId,
      loja_id: lojaId,
      grupo_id: grupoId,
      nome: dados.nome.trim(),
      preco_centavos: dados.preco_centavos,
      disponivel: dados.disponivel !== undefined ? dados.disponivel : true,
    };
    grupo.adicionais.push(adFinal);
  }

  salvarLojasLocais(lojas);
  return adFinal;
}

/**
 * Exclui um adicional de um grupo.
 */
export async function excluirAdicional(lojaId: string, grupoId: string, adicionalId: string): Promise<void> {
  await aguardar();
  const lojas = obterLojasLocais();
  const chave = Object.keys(lojas).find((k) => lojas[k].loja.id === lojaId);
  if (!chave) throw new Error('Loja não encontrada.');

  const grupo = lojas[chave].gruposDeAdicionais.find((g) => g.id === grupoId);
  if (!grupo || !grupo.adicionais) return;

  grupo.adicionais = grupo.adicionais.filter((a) => a.id !== adicionalId);
  salvarLojasLocais(lojas);
}

/**
 * Cria ou edita um bairro atendido.
 */
export async function salvarBairro(
  lojaId: string,
  dados: { id?: string; nome: string; taxa_centavos: number; tempo_estimado_min?: number | null; ativo?: boolean }
): Promise<BairroAtendido> {
  await aguardar();
  const lojas = obterLojasLocais();
  const chave = Object.keys(lojas).find((k) => lojas[k].loja.id === lojaId);
  if (!chave) throw new Error('Loja não encontrada.');

  const lojaDados = lojas[chave];
  let bairroFinal: BairroAtendido;

  if (dados.id) {
    const idx = lojaDados.bairros.findIndex((b) => b.id === dados.id);
    if (idx === -1) throw new Error('Bairro não encontrado.');
    bairroFinal = {
      ...lojaDados.bairros[idx],
      nome: dados.nome.trim(),
      taxa_centavos: dados.taxa_centavos,
      tempo_estimado_min: dados.tempo_estimado_min !== undefined ? dados.tempo_estimado_min : lojaDados.bairros[idx].tempo_estimado_min,
      ativo: dados.ativo !== undefined ? dados.ativo : lojaDados.bairros[idx].ativo,
    };
    lojaDados.bairros[idx] = bairroFinal;
  } else {
    const novoId = 'bairro-' + Math.random().toString(36).substring(2, 9);
    bairroFinal = {
      id: novoId,
      loja_id: lojaId,
      nome: dados.nome.trim(),
      taxa_centavos: dados.taxa_centavos,
      tempo_estimado_min: dados.tempo_estimado_min || null,
      ativo: dados.ativo !== undefined ? dados.ativo : true,
    };
    lojaDados.bairros.push(bairroFinal);
  }

  salvarLojasLocais(lojas);
  return bairroFinal;
}

/**
 * Exclui um bairro atendido.
 */
export async function excluirBairro(lojaId: string, bairroId: string): Promise<void> {
  await aguardar();
  const lojas = obterLojasLocais();
  const chave = Object.keys(lojas).find((k) => lojas[k].loja.id === lojaId);
  if (!chave) throw new Error('Loja não encontrada.');

  lojas[chave].bairros = lojas[chave].bairros.filter((b) => b.id !== bairroId);
  salvarLojasLocais(lojas);
}

/**
 * Ativa ou desativa um bairro.
 */
export async function alternarStatusBairro(lojaId: string, bairroId: string, ativo: boolean): Promise<BairroAtendido> {
  await aguardar();
  const lojas = obterLojasLocais();
  const chave = Object.keys(lojas).find((k) => lojas[k].loja.id === lojaId);
  if (!chave) throw new Error('Loja não encontrada.');

  const bairro = lojas[chave].bairros.find((b) => b.id === bairroId);
  if (!bairro) throw new Error('Bairro não encontrado.');

  bairro.ativo = ativo;
  salvarLojasLocais(lojas);
  return bairro;
}

/**
 * Salva as configurações gerais da loja e seus horários de funcionamento.
 */
export async function salvarDadosDaLoja(
  lojaId: string,
  dadosLoja: Partial<Loja>,
  horarios?: HorarioFuncionamento[]
): Promise<Loja> {
  await aguardar();
  const lojas = obterLojasLocais();
  const chave = Object.keys(lojas).find((k) => lojas[k].loja.id === lojaId);
  if (!chave) throw new Error('Loja não encontrada.');

  const lojaAtual = lojas[chave].loja;

  const atualizada: Loja = {
    ...lojaAtual,
    ...dadosLoja,
    // Garante que campos essenciais mantenham integridade
    id: lojaAtual.id,
    link: lojaAtual.link,
  };

  lojas[chave].loja = atualizada;

  if (horarios) {
    lojas[chave].horarios = horarios.map((h) => ({
      ...h,
      loja_id: lojaId,
      id: h.id || 'horario-' + Math.random().toString(36).substring(2, 9),
    }));
  }

  salvarLojasLocais(lojas);

  try {
    const objetoValidoSupabase: Record<string, any> = {
      nome: atualizada.nome,
      descricao: atualizada.descricao,
      telefone_whatsapp: atualizada.telefone_whatsapp,
      logo_url: atualizada.logo_url,
      capa_url: atualizada.capa_url,
      cor_principal: atualizada.cor_principal,
      endereco: atualizada.endereco,
      aberta: atualizada.aberta,
      aceita_entrega: atualizada.aceita_entrega,
      aceita_retirada: atualizada.aceita_retirada,
      pedido_minimo_centavos: atualizada.pedido_minimo_centavos,
    };
    const { error: errUpdate } = await supabase.from('lojas').update(objetoValidoSupabase).eq('id', lojaId);
    if (errUpdate) {
      console.warn('Aviso ao atualizar loja no Supabase:', errUpdate);
    }
  } catch (err) {
    console.warn('Falha ao atualizar dados da loja no Supabase', err);
  }

  return atualizada;
}

export interface DadosCadastroLoja {
  nome: string;
  link: string;
  nomeResponsavel: string;
  email: string;
  telefone?: string;
  corPrincipal?: string;
}

/**
 * Cria uma nova lanchonete/loja com estrutura inicial e salva no armazenamento local.
 */
export async function cadastrarNovaLoja(dados: DadosCadastroLoja): Promise<Loja> {
  await aguardar();
  const lojas = obterLojasLocais();

  const slug = dados.link.trim().toLowerCase();
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('Link inválido. Use apenas letras minúsculas, números e hífens.');
  }

  if (lojas[slug]) {
    throw new Error('Este link de loja já está em uso. Escolha outro.');
  }

  const novaId = 'loja-' + Math.random().toString(36).substring(2, 10);
  const cor = dados.corPrincipal || '#B4412B';

  const novaLoja: Loja = {
    id: novaId,
    link: slug,
    nome: dados.nome.trim(),
    descricao: `Cardápio online de ${dados.nome.trim()}. Faça seu pedido direto pelo WhatsApp!`,
    telefone_whatsapp: dados.telefone ? dados.telefone.replace(/\D/g, '') : null,
    logo_url: null,
    capa_url: null,
    cor_principal: cor,
    endereco: null,
    aberta: true,
    ativa: true,
    aceita_entrega: true,
    aceita_retirada: true,
    pedido_minimo_centavos: 0,
    ultimo_numero_pedido: 0,
    criada_em: new Date().toISOString(),
    chave_pix: null,
    nome_titular_pix: null,
  };

  const categoriaInicial: Categoria = {
    id: 'cat-' + Math.random().toString(36).substring(2, 9),
    loja_id: novaId,
    nome: 'Mais Pedidos',
    posicao: 1,
    ativa: true,
  };

  const diasSemana = [0, 1, 2, 3, 4, 5, 6];
  const horariosPadrao: HorarioFuncionamento[] = diasSemana.map((dia) => ({
    id: 'h-' + novaId + '-' + dia,
    loja_id: novaId,
    dia_semana: dia,
    abre: '18:00',
    fecha: '23:30',
  }));

  lojas[slug] = {
    loja: novaLoja,
    categorias: [categoriaInicial],
    produtos: [],
    gruposDeAdicionais: [],
    produtoGrupos: [],
    bairros: [
      {
        id: 'bairro-' + Math.random().toString(36).substring(2, 9),
        loja_id: novaId,
        nome: 'Centro',
        taxa_centavos: 500,
        tempo_estimado_min: 30,
        ativo: true,
      },
    ],
    horarios: horariosPadrao,
  };

  salvarLojasLocais(lojas);

  // Tenta persistir a nova loja e dados iniciais no Supabase
  try {
    const { data: lojaDb, error } = await supabase
      .from('lojas')
      .insert({
        link: slug,
        nome: dados.nome.trim(),
        descricao: `Cardápio online de ${dados.nome.trim()}.`,
        telefone_whatsapp: dados.telefone ? dados.telefone.replace(/\D/g, '') : null,
        cor_principal: cor,
        aberta: true,
        ativa: true,
        aceita_entrega: true,
        aceita_retirada: true,
        pedido_minimo_centavos: 0,
      })
      .select('*')
      .maybeSingle();

    if (!error && lojaDb) {
      novaLoja.id = lojaDb.id;
      lojas[slug].loja.id = lojaDb.id;

      // Cria categoria padrão inicial no Supabase
      await supabase.from('categorias').insert({
        loja_id: lojaDb.id,
        nome: 'Mais Pedidos',
        posicao: 1,
        ativa: true,
      });

      // Cria bairro padrão inicial no Supabase
      await supabase.from('bairros_atendidos').insert({
        loja_id: lojaDb.id,
        nome: 'Centro',
        taxa_centavos: 500,
        tempo_estimado_min: 30,
        ativo: true,
      });

      salvarLojasLocais(lojas);
    }
  } catch (err) {
    console.warn('Persistência no Supabase da nova loja falhou:', err);
  }

  return novaLoja;
}

// ==========================================
// FUNÇÕES DE ACESSO A DADOS: CAIXA E FINANCEIRO
// ==========================================

const CHAVE_STORAGE_CAIXAS = 'kodfood_sessoes_caixa';

function obterSessoesCaixaArmazenadas(): SessaoCaixa[] {
  if (typeof window === 'undefined') return [];
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE_CAIXAS);
    return salvo ? JSON.parse(salvo) : [];
  } catch {
    return [];
  }
}

function salvarSessoesCaixaArmazenadas(sessoes: SessaoCaixa[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHAVE_STORAGE_CAIXAS, JSON.stringify(sessoes));
  } catch (e) {
    console.error('Erro ao salvar sessões de caixa', e);
  }
}

/**
 * Retorna a sessão de caixa atualmente aberta da loja, enriquecida com os totais de vendas.
 */
export async function obterSessaoCaixaAtual(lojaId: string): Promise<SessaoCaixa | null> {
  await aguardar();
  const sessoes = obterSessoesCaixaArmazenadas();
  const aberta = sessoes.find((s) => s.loja_id === lojaId && s.status === 'aberto');
  if (!aberta) return null;

  // Enriquecer com vendas registradas nos pedidos desde que o caixa abriu
  const pedidos = obterPedidosArmazenados().filter(
    (p) => p.loja_id === lojaId && p.situacao !== 'cancelado' && new Date(p.feito_em) >= new Date(aberta.aberto_em)
  );

  let vendasDinheiro = 0;
  let vendasPix = 0;
  let vendasCartao = 0;

  for (const ped of pedidos) {
    if (ped.forma_pagamento === 'dinheiro') {
      vendasDinheiro += ped.total_centavos;
    } else if (ped.forma_pagamento === 'pix') {
      vendasPix += ped.total_centavos;
    } else if (ped.forma_pagamento === 'cartao') {
      vendasCartao += ped.total_centavos;
    }
  }

  const saldoEsperado =
    aberta.saldo_inicial_centavos +
    vendasDinheiro +
    (aberta.total_suprimentos_centavos || 0) -
    (aberta.total_sangrias_centavos || 0);

  return {
    ...aberta,
    total_vendas_dinheiro_centavos: vendasDinheiro,
    total_vendas_pix_centavos: vendasPix,
    total_vendas_cartao_centavos: vendasCartao,
    saldo_esperado_dinheiro_centavos: saldoEsperado,
  };
}

/**
 * Abre um novo caixa do dia com fundo de troco inicial.
 */
export async function abrirCaixa(
  lojaId: string,
  saldoInicialCentavos: number
): Promise<SessaoCaixa> {
  await aguardar();
  const sessoes = obterSessoesCaixaArmazenadas();
  const existente = sessoes.find((s) => s.loja_id === lojaId && s.status === 'aberto');
  if (existente) {
    throw new Error('Já existe um caixa aberto para esta lanchonete.');
  }

  const agora = new Date().toISOString();
  const novaSessao: SessaoCaixa = {
    id: 'cx-' + Math.random().toString(36).substring(2, 10),
    loja_id: lojaId,
    aberto_em: agora,
    fechado_em: null,
    status: 'aberto',
    saldo_inicial_centavos: Math.max(0, saldoInicialCentavos),
    total_vendas_dinheiro_centavos: 0,
    total_vendas_pix_centavos: 0,
    total_vendas_cartao_centavos: 0,
    total_suprimentos_centavos: 0,
    total_sangrias_centavos: 0,
    saldo_esperado_dinheiro_centavos: Math.max(0, saldoInicialCentavos),
    saldo_apurado_dinheiro_centavos: null,
    diferenca_centavos: null,
    observacoes: null,
    movimentos: [],
  };

  sessoes.push(novaSessao);
  salvarSessoesCaixaArmazenadas(sessoes);
  return novaSessao;
}

/**
 * Adiciona uma movimentação de sangria (retirada) ou suprimento (entrada) no caixa aberto.
 */
export async function adicionarMovimentoCaixa(
  lojaId: string,
  dados: {
    tipo: 'suprimento' | 'sangria';
    motivo: string;
    valor_centavos: number;
  }
): Promise<MovimentoCaixa> {
  await aguardar();
  const sessoes = obterSessoesCaixaArmazenadas();
  const idx = sessoes.findIndex((s) => s.loja_id === lojaId && s.status === 'aberto');
  if (idx === -1) {
    throw new Error('Não há caixa aberto no momento.');
  }

  if (dados.valor_centavos <= 0) {
    throw new Error('Informe um valor maior que zero.');
  }

  if (!dados.motivo.trim()) {
    throw new Error('Informe o motivo da movimentação.');
  }

  const sessao = sessoes[idx];
  const movimento: MovimentoCaixa = {
    id: 'mov-' + Math.random().toString(36).substring(2, 9),
    sessao_caixa_id: sessao.id,
    tipo: dados.tipo,
    motivo: dados.motivo.trim(),
    valor_centavos: dados.valor_centavos,
    forma_pagamento: 'dinheiro',
    feito_em: new Date().toISOString(),
  };

  if (dados.tipo === 'suprimento') {
    sessao.total_suprimentos_centavos = (sessao.total_suprimentos_centavos || 0) + dados.valor_centavos;
  } else {
    sessao.total_sangrias_centavos = (sessao.total_sangrias_centavos || 0) + dados.valor_centavos;
  }

  sessao.movimentos = [...(sessao.movimentos || []), movimento];
  sessoes[idx] = sessao;
  salvarSessoesCaixaArmazenadas(sessoes);
  return movimento;
}

/**
 * Fecha a sessão atual do caixa realizando a conferência dos valores físicos.
 */
export async function fecharCaixa(
  lojaId: string,
  saldoApuradoDinheiroCentavos: number,
  observacoes?: string
): Promise<SessaoCaixa> {
  await aguardar();
  const sessoes = obterSessoesCaixaArmazenadas();
  const idx = sessoes.findIndex((s) => s.loja_id === lojaId && s.status === 'aberto');
  if (idx === -1) {
    throw new Error('Não há caixa aberto no momento.');
  }

  const sessaoAtualizada = await obterSessaoCaixaAtual(lojaId);
  if (!sessaoAtualizada) {
    throw new Error('Falha ao consolidar dados do caixa.');
  }

  const agora = new Date().toISOString();
  const diferenca = saldoApuradoDinheiroCentavos - sessaoAtualizada.saldo_esperado_dinheiro_centavos;

  const fechada: SessaoCaixa = {
    ...sessaoAtualizada,
    status: 'fechado',
    fechado_em: agora,
    saldo_apurado_dinheiro_centavos: saldoApuradoDinheiroCentavos,
    diferenca_centavos: diferenca,
    observacoes: observacoes?.trim() || null,
  };

  sessoes[idx] = fechada;
  salvarSessoesCaixaArmazenadas(sessoes);
  return fechada;
}

/**
 * Lista o histórico de caixas anteriores da loja.
 */
export async function listarHistoricoCaixas(lojaId: string): Promise<SessaoCaixa[]> {
  await aguardar();
  const sessoes = obterSessoesCaixaArmazenadas();
  return sessoes
    .filter((s) => s.loja_id === lojaId)
    .sort((a, b) => new Date(b.aberto_em).getTime() - new Date(a.aberto_em).getTime());
}

/**
 * Consolida o resumo financeiro (faturamento, ticket médio, formas de pagamento e ranking de itens).
 */
export async function obterResumoFinanceiro(
  lojaId: string,
  periodo: 'hoje' | 'semana' | 'mes'
): Promise<ResumoFinanceiro> {
  await aguardar();
  const agora = new Date();
  let dataCorte: Date;

  if (periodo === 'hoje') {
    dataCorte = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  } else if (periodo === 'semana') {
    dataCorte = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  } else {
    dataCorte = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }

  const pedidos = obterPedidosArmazenados().filter(
    (p) => p.loja_id === lojaId && new Date(p.feito_em) >= dataCorte
  );

  const concluidos = pedidos.filter((p) => p.situacao !== 'cancelado');
  const cancelados = pedidos.filter((p) => p.situacao === 'cancelado');

  let faturamentoTotal = 0;
  let totalPix = 0;
  let totalCartao = 0;
  let totalDinheiro = 0;
  const mapaProdutos: Record<string, { nome: string; quantidade: number; total_centavos: number }> = {};

  for (const ped of concluidos) {
    faturamentoTotal += ped.total_centavos;

    if (ped.forma_pagamento === 'pix') totalPix += ped.total_centavos;
    else if (ped.forma_pagamento === 'cartao') totalCartao += ped.total_centavos;
    else if (ped.forma_pagamento === 'dinheiro') totalDinheiro += ped.total_centavos;

    for (const item of (ped.itens || [])) {
      const idOuNome = item.produto_id || item.nome_produto || 'sem_id';
      if (!mapaProdutos[idOuNome]) {
        mapaProdutos[idOuNome] = {
          nome: item.nome_produto,
          quantidade: 0,
          total_centavos: 0,
        };
      }
      mapaProdutos[idOuNome].quantidade += item.quantidade;
      mapaProdutos[idOuNome].total_centavos += item.preco_unitario_centavos * item.quantidade;
    }
  }

  const ticketMedio = concluidos.length > 0 ? Math.round(faturamentoTotal / concluidos.length) : 0;

  const rankingProdutos = Object.entries(mapaProdutos)
    .map(([produto_id, dados]) => ({
      produto_id,
      nome: dados.nome,
      quantidade: dados.quantidade,
      total_centavos: dados.total_centavos,
    }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 10);

  return {
    periodo,
    faturamento_total_centavos: faturamentoTotal,
    quantidade_pedidos_concluidos: concluidos.length,
    quantidade_pedidos_cancelados: cancelados.length,
    ticket_medio_centavos: ticketMedio,
    total_por_pagamento: {
      pix_centavos: totalPix,
      cartao_centavos: totalCartao,
      dinheiro_centavos: totalDinheiro,
    },
    produtos_mais_vendidos: rankingProdutos,
  };
}

// ==========================================
// FUNÇÕES DE ACESSO A DADOS: MESAS E COMANDAS
// ==========================================

const CHAVE_STORAGE_MESAS = 'kodfood_mesas';

function obterMesasArmazenadas(): Record<string, Mesa[]> {
  if (typeof window === 'undefined') return {};
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE_MESAS);
    return salvo ? JSON.parse(salvo) : {};
  } catch {
    return {};
  }
}

function salvarMesasArmazenadas(mapa: Record<string, Mesa[]>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHAVE_STORAGE_MESAS, JSON.stringify(mapa));
  } catch (e) {
    console.error('Erro ao salvar mesas', e);
  }
}

/**
 * Retorna as mesas da loja com cálculos atualizados de consumo e status.
 */
export async function listarMesas(lojaId: string): Promise<Mesa[]> {
  await aguardar();
  const mapa = obterMesasArmazenadas();
  let mesasDaLoja = mapa[lojaId];

  // Se a loja ainda não tem mesas cadastradas, inicializa 10 mesas padrão
  if (!mesasDaLoja || mesasDaLoja.length === 0) {
    mesasDaLoja = Array.from({ length: 10 }, (_, i) => ({
      id: `mesa-${lojaId}-${i + 1}`,
      loja_id: lojaId,
      numero: i + 1,
      nome_identificador: `Mesa ${String(i + 1).padStart(2, '0')}`,
      status: 'livre',
      capacidade: 4,
      aberta_em: null,
      cliente_nome: null,
      pedidos_ids: [],
      subtotal_centavos: 0,
      total_centavos: 0,
    }));
    mapa[lojaId] = mesasDaLoja;
    salvarMesasArmazenadas(mapa);
  }

  // Sincroniza os totais e status de cada mesa com os pedidos ativos
  const todosPedidos = obterPedidosArmazenados();

  const mesasAtualizadas = mesasDaLoja.map((mesa) => {
    if (mesa.status === 'livre' || mesa.pedidos_ids.length === 0) {
      return {
        ...mesa,
        subtotal_centavos: 0,
        total_centavos: 0,
      };
    }

    const pedidosMesa = todosPedidos.filter(
      (p) => mesa.pedidos_ids.includes(p.id) && p.situacao !== 'cancelado'
    );

    const totalAcumulado = pedidosMesa.reduce((acc, p) => acc + p.total_centavos, 0);

    return {
      ...mesa,
      subtotal_centavos: totalAcumulado,
      total_centavos: totalAcumulado,
    };
  });

  return mesasAtualizadas;
}

/**
 * Abre uma mesa informando opcionalmente o nome do cliente.
 */
export async function abrirMesa(
  lojaId: string,
  mesaId: string,
  clienteNome?: string
): Promise<Mesa> {
  await aguardar();
  const mapa = obterMesasArmazenadas();
  const mesas = mapa[lojaId] || [];
  const idx = mesas.findIndex((m) => m.id === mesaId);
  if (idx === -1) throw new Error('Mesa não encontrada.');

  mesas[idx] = {
    ...mesas[idx],
    status: 'ocupada',
    aberta_em: new Date().toISOString(),
    cliente_nome: clienteNome?.trim() || null,
    pedidos_ids: [],
    subtotal_centavos: 0,
    total_centavos: 0,
  };

  mapa[lojaId] = mesas;
  salvarMesasArmazenadas(mapa);
  return mesas[idx];
}

/**
 * Lança um novo pedido (rodada) para uma mesa aberta e envia para a cozinha.
 */
export async function lancarPedidoMesa(
  lojaId: string,
  mesaId: string,
  itens: Array<{
    produtoId: string;
    quantidade: number;
    adicionaisIds?: string[];
    observacao?: string;
  }>
): Promise<Pedido> {
  await aguardar();
  const mapa = obterMesasArmazenadas();
  const mesas = mapa[lojaId] || [];
  const idx = mesas.findIndex((m) => m.id === mesaId);
  if (idx === -1) throw new Error('Mesa não encontrada.');

  const mesa = mesas[idx];
  const lojas = obterLojasLocais();
  const lojaChave = Object.keys(lojas).find((k) => lojas[k].loja.id === lojaId);
  if (!lojaChave) throw new Error('Loja não encontrada.');
  const dadosLoja = lojas[lojaChave];

  // Monta os itens do pedido com preços calculados
  let subtotal = 0;
  const pedidoItensFinal: PedidoItem[] = [];
  const pedidoId = 'ped-' + Math.random().toString(36).substring(2, 9);

  for (const item of itens) {
    const prod = dadosLoja.produtos.find((p) => p.id === item.produtoId);
    if (!prod) continue;

    let precoItem = prod.preco_centavos;
    const adicionaisFinal: PedidoItemAdicional[] = [];

    if (item.adicionaisIds && item.adicionaisIds.length > 0) {
      for (const grp of dadosLoja.gruposDeAdicionais) {
        for (const ad of grp.adicionais || []) {
          if (item.adicionaisIds.includes(ad.id)) {
            precoItem += ad.preco_centavos;
            adicionaisFinal.push({
              id: 'add-item-' + Math.random().toString(36).substring(2, 9),
              item_id: 'temp',
              adicional_id: ad.id,
              nome_adicional: ad.nome,
              preco_centavos: ad.preco_centavos,
            });
          }
        }
      }
    }

    const totalLinha = precoItem * item.quantidade;
    subtotal += totalLinha;

    const itemFinal: PedidoItem = {
      id: 'item-' + Math.random().toString(36).substring(2, 9),
      pedido_id: pedidoId,
      produto_id: prod.id,
      nome_produto: prod.nome,
      preco_unitario_centavos: precoItem,
      quantidade: item.quantidade,
      observacao: item.observacao?.trim() || null,
      adicionais: adicionaisFinal,
    };

    pedidoItensFinal.push(itemFinal);
  }

  if (pedidoItensFinal.length === 0) {
    throw new Error('Nenhum item válido informado para o pedido.');
  }

  // Incrementa número do pedido
  dadosLoja.loja.ultimo_numero_pedido += 1;
  const proximoNumero = dadosLoja.loja.ultimo_numero_pedido;
  salvarLojasLocais(lojas);

  const agora = new Date().toISOString();
  const novoPedido: Pedido = {
    id: pedidoId,
    loja_id: lojaId,
    numero: proximoNumero,
    cliente_id: null,
    nome_cliente: mesa.cliente_nome ? `${mesa.nome_identificador} (${mesa.cliente_nome})` : mesa.nome_identificador,
    telefone_cliente: '',
    tipo: 'mesa',
    mesa_numero: mesa.numero,
    comanda_identificador: mesa.nome_identificador,
    situacao: 'em_preparo',
    forma_pagamento: 'dinheiro', // forma temporária até o fechamento da conta
    troco_para_centavos: null,
    bairro_id: null,
    nome_do_bairro: null,
    rua: null,
    numero_casa: null,
    complemento: null,
    referencia: null,
    subtotal_centavos: subtotal,
    taxa_entrega_centavos: 0,
    total_centavos: subtotal,
    observacao: `Pedido presencial ${mesa.nome_identificador}`,
    codigo_acompanhamento: Math.random().toString(36).substring(2, 12),
    feito_em: agora,
    atualizado_em: agora,
    itens: pedidoItensFinal,
  };

  // Salva no banco de pedidos
  const todosPedidos = obterPedidosArmazenados();
  todosPedidos.unshift(novoPedido);
  salvarPedidosArmazenados(todosPedidos);

  // Baixa automática no estoque para produtos com controle ativo
  darBaixaEstoquePedido(lojaId, novoPedido);

  // Vincula pedido à mesa
  mesa.status = 'ocupada';
  if (!mesa.aberta_em) mesa.aberta_em = agora;
  mesa.pedidos_ids = [...mesa.pedidos_ids, pedidoId];
  mesa.subtotal_centavos = (mesa.subtotal_centavos || 0) + subtotal;
  mesa.total_centavos = (mesa.total_centavos || 0) + subtotal;

  mesas[idx] = mesa;
  mapa[lojaId] = mesas;
  salvarMesasArmazenadas(mapa);

  return novoPedido;
}

/**
 * Altera a mesa para o estado 'conta' (aguardando pagamento).
 */
export async function solicitarContaMesa(lojaId: string, mesaId: string): Promise<Mesa> {
  await aguardar();
  const mapa = obterMesasArmazenadas();
  const mesas = mapa[lojaId] || [];
  const idx = mesas.findIndex((m) => m.id === mesaId);
  if (idx === -1) throw new Error('Mesa não encontrada.');

  mesas[idx] = {
    ...mesas[idx],
    status: 'conta',
  };

  mapa[lojaId] = mesas;
  salvarMesasArmazenadas(mapa);
  return mesas[idx];
}

/**
 * Fecha a conta da mesa, finaliza os pedidos e libera a mesa para 'livre'.
 */
export async function fecharContaMesa(
  lojaId: string,
  mesaId: string,
  dadosPagamento: {
    forma: FormaPagamento;
    valorPagoCentavos?: number;
    trocoParaCentavos?: number;
  }
): Promise<{ mesa: Mesa; totalPagoCentavos: number; pedidosConcluidos: Pedido[] }> {
  await aguardar();
  const mapa = obterMesasArmazenadas();
  const mesas = mapa[lojaId] || [];
  const idx = mesas.findIndex((m) => m.id === mesaId);
  if (idx === -1) throw new Error('Mesa não encontrada.');

  const mesa = mesas[idx];
  const todosPedidos = obterPedidosArmazenados();

  // Marca os pedidos da mesa como entregues e atualiza forma de pagamento
  const pedidosConcluidos: Pedido[] = [];
  const pedidosAtualizados = todosPedidos.map((ped) => {
    if (mesa.pedidos_ids.includes(ped.id)) {
      const atualizado: Pedido = {
        ...ped,
        situacao: 'entregue',
        forma_pagamento: dadosPagamento.forma,
        atualizado_em: new Date().toISOString(),
      };
      pedidosConcluidos.push(atualizado);
      return atualizado;
    }
    return ped;
  });

  salvarPedidosArmazenados(pedidosAtualizados);

  const totalPago = mesa.total_centavos;

  // Libera a mesa
  const mesaLiberada: Mesa = {
    ...mesa,
    status: 'livre',
    aberta_em: null,
    cliente_nome: null,
    pedidos_ids: [],
    subtotal_centavos: 0,
    total_centavos: 0,
  };

  mesas[idx] = mesaLiberada;
  mapa[lojaId] = mesas;
  salvarMesasArmazenadas(mapa);

  return {
    mesa: mesaLiberada,
    totalPagoCentavos: totalPago,
    pedidosConcluidos,
  };
}

/**
 * Configura o número total de mesas da loja.
 */
export async function configurarQuantidadeMesas(
  lojaId: string,
  quantidade: number
): Promise<Mesa[]> {
  await aguardar();
  const mapa = obterMesasArmazenadas();
  const qtd = Math.max(1, Math.min(100, quantidade));

  const existentes = mapa[lojaId] || [];
  const novas: Mesa[] = [];

  for (let i = 1; i <= qtd; i++) {
    const achada = existentes.find((m) => m.numero === i);
    if (achada) {
      novas.push(achada);
    } else {
      novas.push({
        id: `mesa-${lojaId}-${i}`,
        loja_id: lojaId,
        numero: i,
        nome_identificador: `Mesa ${String(i).padStart(2, '0')}`,
        status: 'livre',
        capacidade: 4,
        aberta_em: null,
        cliente_nome: null,
        pedidos_ids: [],
        subtotal_centavos: 0,
        total_centavos: 0,
      });
    }
  }

  mapa[lojaId] = novas;
  salvarMesasArmazenadas(mapa);
  return novas;
}

// ==========================================
// MÓDULO DE CONTROLE DE ESTOQUE
// ==========================================

const CHAVE_STORAGE_ESTOQUE_MOVIMENTACOES = 'kodfood_estoque_movimentacoes';

function obterMovimentacoesEstoqueArmazenadas(): MovimentacaoEstoque[] {
  if (typeof window === 'undefined') return [];
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE_ESTOQUE_MOVIMENTACOES);
    return salvo ? JSON.parse(salvo) : [];
  } catch {
    return [];
  }
}

function salvarMovimentacoesEstoqueArmazenadas(movs: MovimentacaoEstoque[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHAVE_STORAGE_ESTOQUE_MOVIMENTACOES, JSON.stringify(movs));
  } catch (e) {
    console.error('Erro ao salvar movimentações de estoque', e);
  }
}

/**
 * Realiza a baixa automática do estoque de produtos controlados ao confirmar/criar um pedido.
 */
export function darBaixaEstoquePedido(lojaId: string, pedido: Pedido) {
  const lojas = obterLojasLocais();
  const chave = Object.keys(lojas).find((k) => lojas[k].loja.id === lojaId);
  if (!chave) return;

  const dadosLoja = lojas[chave];
  const movs = obterMovimentacoesEstoqueArmazenadas();
  let houveAlteracao = false;

  for (const item of pedido.itens || []) {
    const prod = dadosLoja.produtos.find((p) => p.id === item.produto_id);
    if (!prod || !prod.controlar_estoque) continue;

    const anterior = prod.quantidade_estoque || 0;
    const novo = Math.max(0, anterior - item.quantidade);

    prod.quantidade_estoque = novo;
    if (novo <= 0) {
      prod.disponivel = false; // esgota automaticamente e pausa no cardápio!
    }
    houveAlteracao = true;

    movs.unshift({
      id: 'mov-est-' + Math.random().toString(36).substring(2, 9),
      loja_id: lojaId,
      produto_id: prod.id,
      nome_produto: prod.nome,
      tipo: 'saida_venda',
      quantidade: -item.quantidade,
      estoque_anterior: anterior,
      estoque_novo: novo,
      motivo: `Venda Pedido #${pedido.numero}`,
      data_hora: new Date().toISOString(),
    });
  }

  if (houveAlteracao) {
    salvarLojasLocais(lojas);
    salvarMovimentacoesEstoqueArmazenadas(movs);
  }
}

/**
 * Estorna a quantidade no estoque quando um pedido é cancelado.
 */
export function estornarEstoquePedido(lojaId: string, pedido: Pedido) {
  const lojas = obterLojasLocais();
  const chave = Object.keys(lojas).find((k) => lojas[k].loja.id === lojaId);
  if (!chave) return;

  const dadosLoja = lojas[chave];
  const movs = obterMovimentacoesEstoqueArmazenadas();
  let houveAlteracao = false;

  for (const item of pedido.itens || []) {
    const prod = dadosLoja.produtos.find((p) => p.id === item.produto_id);
    if (!prod || !prod.controlar_estoque) continue;

    const anterior = prod.quantidade_estoque || 0;
    const novo = anterior + item.quantidade;

    prod.quantidade_estoque = novo;
    if (novo > 0) {
      prod.disponivel = true; // despausa se tiver voltado estoque!
    }
    houveAlteracao = true;

    movs.unshift({
      id: 'mov-est-' + Math.random().toString(36).substring(2, 9),
      loja_id: lojaId,
      produto_id: prod.id,
      nome_produto: prod.nome,
      tipo: 'ajuste_manual',
      quantidade: item.quantidade,
      estoque_anterior: anterior,
      estoque_novo: novo,
      motivo: `Estorno Pedido Cancelado #${pedido.numero}`,
      data_hora: new Date().toISOString(),
    });
  }

  if (houveAlteracao) {
    salvarLojasLocais(lojas);
    salvarMovimentacoesEstoqueArmazenadas(movs);
  }
}

/**
 * Retorna o painel completo de estoque da loja (produtos, alertas de estoque baixo e histórico).
 */
export async function listarEstoque(lojaId: string): Promise<{
  produtos: Produto[];
  alertasEstoqueBaixo: Produto[];
  esgotados: Produto[];
  movimentacoes: MovimentacaoEstoque[];
}> {
  await aguardar();
  const lojas = obterLojasLocais();
  const chave = Object.keys(lojas).find((k) => lojas[k].loja.id === lojaId);
  if (!chave) return { produtos: [], alertasEstoqueBaixo: [], esgotados: [], movimentacoes: [] };

  const dadosLoja = lojas[chave];

  // Se nenhum produto tem campos de estoque definidos ainda, inicializa valores inteligentes de exemplo
  let houveInit = false;
  for (const prod of dadosLoja.produtos) {
    if (prod.controlar_estoque === undefined) {
      const eBebida =
        prod.nome.toLowerCase().includes('coca') ||
        prod.nome.toLowerCase().includes('cerveja') ||
        prod.nome.toLowerCase().includes('suco') ||
        prod.nome.toLowerCase().includes('guaraná') ||
        prod.nome.toLowerCase().includes('água');

      prod.controlar_estoque = eBebida;
      prod.quantidade_estoque = eBebida ? 24 : 50;
      prod.estoque_minimo = 5;
      houveInit = true;
    }
  }
  if (houveInit) {
    salvarLojasLocais(lojas);
  }

  const produtosComEstoque = dadosLoja.produtos;
  const alertasEstoqueBaixo = produtosComEstoque.filter(
    (p) => p.controlar_estoque && (p.quantidade_estoque || 0) <= (p.estoque_minimo || 5) && (p.quantidade_estoque || 0) > 0
  );
  const esgotados = produtosComEstoque.filter(
    (p) => p.controlar_estoque && (p.quantidade_estoque || 0) <= 0
  );

  const movs = obterMovimentacoesEstoqueArmazenadas().filter((m) => m.loja_id === lojaId);

  return {
    produtos: produtosComEstoque,
    alertasEstoqueBaixo,
    esgotados,
    movimentacoes: movs,
  };
}

/**
 * Registra a entrada / reposição de mercadoria no estoque.
 */
export async function adicionarEntradaEstoque(
  lojaId: string,
  produtoId: string,
  quantidadeAdicionada: number,
  motivo: string
): Promise<Produto> {
  await aguardar();
  const lojas = obterLojasLocais();
  const chave = Object.keys(lojas).find((k) => lojas[k].loja.id === lojaId);
  if (!chave) throw new Error('Loja não encontrada.');

  const dadosLoja = lojas[chave];
  const prod = dadosLoja.produtos.find((p) => p.id === produtoId);
  if (!prod) throw new Error('Produto não encontrado.');

  const anterior = prod.quantidade_estoque || 0;
  const novo = anterior + Math.max(1, quantidadeAdicionada);

  prod.quantidade_estoque = novo;
  prod.controlar_estoque = true;
  if (novo > 0) {
    prod.disponivel = true;
  }

  const movs = obterMovimentacoesEstoqueArmazenadas();
  movs.unshift({
    id: 'mov-est-' + Math.random().toString(36).substring(2, 9),
    loja_id: lojaId,
    produto_id: prod.id,
    nome_produto: prod.nome,
    tipo: 'entrada',
    quantidade: Math.max(1, quantidadeAdicionada),
    estoque_anterior: anterior,
    estoque_novo: novo,
    motivo: motivo.trim() || 'Entrada / Compra de Mercadoria',
    data_hora: new Date().toISOString(),
  });

  salvarLojasLocais(lojas);
  salvarMovimentacoesEstoqueArmazenadas(movs);
  return prod;
}

/**
 * Ajusta a quantidade de estoque manualmente (inventário / contagem física / perda).
 */
export async function ajustarEstoqueManual(
  lojaId: string,
  produtoId: string,
  novaQuantidade: number,
  motivo: string
): Promise<Produto> {
  await aguardar();
  const lojas = obterLojasLocais();
  const chave = Object.keys(lojas).find((k) => lojas[k].loja.id === lojaId);
  if (!chave) throw new Error('Loja não encontrada.');

  const dadosLoja = lojas[chave];
  const prod = dadosLoja.produtos.find((p) => p.id === produtoId);
  if (!prod) throw new Error('Produto não encontrado.');

  const anterior = prod.quantidade_estoque || 0;
  const novo = Math.max(0, novaQuantidade);
  const diferenca = novo - anterior;

  prod.quantidade_estoque = novo;
  prod.controlar_estoque = true;
  if (novo <= 0) {
    prod.disponivel = false;
  } else if (!prod.disponivel && novo > 0) {
    prod.disponivel = true;
  }

  const movs = obterMovimentacoesEstoqueArmazenadas();
  movs.unshift({
    id: 'mov-est-' + Math.random().toString(36).substring(2, 9),
    loja_id: lojaId,
    produto_id: prod.id,
    nome_produto: prod.nome,
    tipo: diferenca < 0 ? 'perda_descarte' : 'ajuste_manual',
    quantidade: diferenca,
    estoque_anterior: anterior,
    estoque_novo: novo,
    motivo: motivo.trim() || 'Ajuste manual de estoque',
    data_hora: new Date().toISOString(),
  });

  salvarLojasLocais(lojas);
  salvarMovimentacoesEstoqueArmazenadas(movs);
  return prod;
}

/**
 * Configura se o produto deve ter controle de estoque ativo e seus limites.
 */
export async function configurarControleEstoqueProduto(
  lojaId: string,
  produtoId: string,
  dados: {
    controlar_estoque: boolean;
    quantidade_estoque: number;
    estoque_minimo: number;
  }
): Promise<Produto> {
  await aguardar();
  const lojas = obterLojasLocais();
  const chave = Object.keys(lojas).find((k) => lojas[k].loja.id === lojaId);
  if (!chave) throw new Error('Loja não encontrada.');

  const dadosLoja = lojas[chave];
  const prod = dadosLoja.produtos.find((p) => p.id === produtoId);
  if (!prod) throw new Error('Produto não encontrado.');

  prod.controlar_estoque = dados.controlar_estoque;
  prod.quantidade_estoque = Math.max(0, dados.quantidade_estoque);
  prod.estoque_minimo = Math.max(0, dados.estoque_minimo);

  if (dados.controlar_estoque && prod.quantidade_estoque <= 0) {
    prod.disponivel = false;
  } else if (dados.controlar_estoque && prod.quantidade_estoque > 0 && !prod.disponivel) {
    prod.disponivel = true;
  }

  salvarLojasLocais(lojas);
  return prod;
}




