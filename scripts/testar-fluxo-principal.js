// =====================================================================
// TESTE AUTOMATIZADO INTEGRADO: FLUXO PRINCIPAL DO KODFOOD
// Pedido (Cardápio/Checkout) -> Painel do Lojista -> Acompanhamento do Cliente
// =====================================================================

const WebSocket = require('ws');
global.WebSocket = WebSocket;
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('ERRO: Variáveis de ambiente Supabase não configuradas.');
  process.exit(1);
}

const supabase = createClient(url, key);

async function rodarTestes() {
  console.log('--- INICIANDO TESTE AUTOMATIZADO DO FLUXO PRINCIPAL ---');
  let testesPassados = 0;
  let totalTestes = 4;

  try {
    // 1. Obter loja e produto ativo
    console.log('[1/4] Buscando loja e catálogo no Supabase...');
    const { data: lojas, error: errLoja } = await supabase
      .from('lojas')
      .select('id, nome, link, aberta')
      .eq('link', 'lanchonete-do-ze')
      .single();

    if (errLoja || !lojas) {
      throw new Error('Falha ao encontrar loja de teste: ' + JSON.stringify(errLoja));
    }

    const { data: produtos, error: errProd } = await supabase
      .from('produtos')
      .select('id, nome, preco_centavos')
      .eq('loja_id', lojas.id)
      .limit(1);

    if (errProd || !produtos || produtos.length === 0) {
      throw new Error('Falha ao encontrar produtos: ' + JSON.stringify(errProd));
    }

    const prod = produtos[0];
    console.log(`✓ Loja: "${lojas.nome}" | Produto: "${prod.nome}" (R$ ${(prod.preco_centavos / 100).toFixed(2)})`);
    testesPassados++;

    // 2. Criar pedido real via RPC criar_pedido
    console.log('[2/4] Criando pedido no checkout...');
    const nomeCliente = 'QA Automação ' + Math.floor(Math.random() * 1000);
    const { data: novoPedido, error: errCriar } = await supabase.rpc('criar_pedido', {
      p_loja_id: lojas.id,
      p_nome: nomeCliente,
      p_telefone: '11988889999',
      p_tipo: 'retirada',
      p_pagamento: 'pix',
      p_itens: [
        {
          produto_id: prod.id,
          quantidade: 2,
          observacao: 'Teste E2E automatizado',
        },
      ],
    });

    if (errCriar || !novoPedido) {
      throw new Error('Falha na RPC criar_pedido: ' + JSON.stringify(errCriar));
    }

    const esperadoTotal = prod.preco_centavos * 2;
    if (novoPedido.total_centavos !== esperadoTotal) {
      throw new Error(`Total incorreto! Esperado: ${esperadoTotal}, recebido: ${novoPedido.total_centavos}`);
    }

    console.log(`✓ Pedido #${novoPedido.numero} criado com sucesso no banco!`);
    console.log(`  - ID: ${novoPedido.pedido_id}`);
    console.log(`  - Código de Acompanhamento: ${novoPedido.codigo_acompanhamento}`);
    console.log(`  - Total: R$ ${(novoPedido.total_centavos / 100).toFixed(2)}`);
    testesPassados++;

    // 3. Verificar pedido no Painel do Lojista
    console.log('[3/4] Validando persistência e leitura no Painel do Lojista...');
    const { data: pedidoNoPainel, error: errPainel } = await supabase
      .from('pedidos')
      .select('id, numero, situacao, nome_cliente, total_centavos')
      .eq('id', novoPedido.pedido_id)
      .single();

    if (errPainel || !pedidoNoPainel) {
      throw new Error('Pedido não localizado no painel: ' + JSON.stringify(errPainel));
    }

    if (pedidoNoPainel.situacao !== 'recebido') {
      throw new Error('Situação inicial incorreta: ' + pedidoNoPainel.situacao);
    }
    console.log(`✓ Pedido encontrado no painel: Situação "${pedidoNoPainel.situacao}" | Cliente: "${pedidoNoPainel.nome_cliente}"`);
    testesPassados++;

    // 4. Lojista avança situação para 'em_preparo' e cliente acompanha
    console.log('[4/4] Lojista avança status para "em_preparo" e cliente acompanha...');
    const { error: errUpdate } = await supabase
      .from('pedidos')
      .update({ situacao: 'em_preparo', atualizado_em: new Date().toISOString() })
      .eq('id', novoPedido.pedido_id);

    if (errUpdate) {
      throw new Error('Falha ao atualizar situação no banco: ' + JSON.stringify(errUpdate));
    }

    // Consulta na tela de acompanhamento pelo código público
    const { data: dadosAcompanhamento, error: errAcomp } = await supabase.rpc('acompanhar_pedido', {
      p_codigo: novoPedido.codigo_acompanhamento,
    });

    if (errAcomp || !dadosAcompanhamento) {
      throw new Error('Falha ao consultar acompanhamento do cliente: ' + JSON.stringify(errAcomp));
    }

    if (dadosAcompanhamento.situacao !== 'em_preparo') {
      throw new Error(`Status no acompanhamento não atualizou! Esperado: em_preparo, obtido: ${dadosAcompanhamento.situacao}`);
    }

    console.log(`✓ Acompanhamento do cliente sincronizado em tempo real: Status "${dadosAcompanhamento.situacao}"`);
    testesPassados++;

    console.log(`\n======================================================`);
    console.log(`🎉 TODOS OS TESTES PASSARAM COM SUCESSO! (${testesPassados}/${totalTestes})`);
    console.log(`O fluxo ponta a ponta (Pedido -> Painel -> Acompanhamento) está 100% validado.`);
    console.log(`======================================================\n`);
  } catch (erro) {
    console.error('\n❌ TESTE FALHOU:', erro.message);
    process.exit(1);
  }
}

rodarTestes();
