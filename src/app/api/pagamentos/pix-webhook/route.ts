import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServidor } from '@/lib/supabase-servidor';
import { processarTransacaoPix } from '@/servicos/confirmacao-pagamento';

export const dynamic = 'force-dynamic';

/** Extrai metadados embutidos na coluna descricao da loja */
function extrairMetaDescricao(descricao: string | null): Record<string, any> {
  if (!descricao) return {};
  const match = descricao.match(/<!--kodfood_meta:([\s\S]*?)-->/);
  if (!match) return {};
  try {
    return JSON.parse(match[1]);
  } catch {
    return {};
  }
}

/** Validação de assinatura HMAC do Mercado Pago (se o segredo estiver configurado) */
function validarAssinaturaMercadoPago(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) {
    return true; // Se o segredo não estiver configurado, a segurança é garantida pela consulta direta à API do MP
  }

  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id');

  if (!xSignature || !xRequestId) {
    console.warn('[Webhook MP] Assinatura x-signature ou x-request-id ausente na requisição');
    return false;
  }

  // Formato x-signature: ts=...,v1=...
  const partes = Object.fromEntries(
    xSignature.split(',').map((p) => {
      const [k, ...v] = p.trim().split('=');
      return [k, v.join('=')];
    })
  );

  const ts = partes['ts'];
  const hashEsperado = partes['v1'];

  if (!ts || !hashEsperado) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  return hmac === hashEsperado;
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    let idTransacao =
      searchParams.get('id') ||
      searchParams.get('data.id') ||
      searchParams.get('resource');

    let body: any = null;
    try {
      body = await req.json();
    } catch {}

    if (!idTransacao && body?.data?.id) {
      idTransacao = String(body.data.id);
    }
    if (!idTransacao && body?.id) {
      idTransacao = String(body.id);
    }

    // Se resource veio como URL da API (ex: /v1/payments/12345), extrai apenas o ID numérico
    if (idTransacao && idTransacao.includes('/')) {
      idTransacao = idTransacao.split('/').pop() || idTransacao;
    }

    if (!idTransacao) {
      return NextResponse.json({ mensagem: 'ID de pagamento ausente' }, { status: 200 });
    }

    // Valida assinatura se o segredo estiver presente
    if (!validarAssinaturaMercadoPago(req, idTransacao)) {
      console.warn('[Webhook MP] Falha na validação da assinatura HMAC do Mercado Pago');
      return NextResponse.json({ erro: 'Assinatura inválida' }, { status: 401 });
    }

    // 1. Busca o pedido para extrair a loja e o token do Mercado Pago
    let tokenDaLoja: string | null = null;
    let pedidoRef: any = null;

    try {
      const { data: p } = await supabaseServidor
        .from('pedidos')
        .select('*')
        .or(`pix_id_transacao.eq.${idTransacao},referencia.like.%${idTransacao}%`)
        .maybeSingle();

      if (p) {
        pedidoRef = p;
        if (p.loja_id) {
          const { data: loja } = await supabaseServidor
            .from('lojas')
            .select('descricao')
            .eq('id', p.loja_id)
            .maybeSingle();

          if (loja?.descricao) {
            const meta = extrairMetaDescricao(loja.descricao);
            tokenDaLoja = meta.mercado_pago_access_token || null;
          }
        }
      }
    } catch (e) {
      console.warn('[Webhook MP] Erro ao buscar token da loja:', e);
    }

    // 2. Executa a validação e processamento unificado
    const resultado = await processarTransacaoPix(idTransacao, tokenDaLoja, pedidoRef);

    if (!resultado.sucesso) {
      console.error('[Webhook MP] Erro ao processar:', resultado.mensagem);
      // Se foi erro de persistência, retorna 500 para o Mercado Pago tentar novamente
      if (resultado.mensagem.includes('banco de dados')) {
        return NextResponse.json({ erro: resultado.mensagem }, { status: 500 });
      }
    }

    return NextResponse.json({
      status: 'ok',
      processado: true,
      pago: resultado.pago,
      mensagem: resultado.mensagem,
    });
  } catch (err: any) {
    console.error('Erro ao processar webhook do Mercado Pago:', err);
    return NextResponse.json({ status: 'erro', erro: err?.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', servico: 'KodFood PIX Webhook' });
}
