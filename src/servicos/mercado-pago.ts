/**
 * Serviço de Integração com o Mercado Pago (API de PIX Dinâmico com Webhook)
 */

export interface ParametrosPixMercadoPago {
  valorCentavos: number;
  descricao: string;
  idPedido: string;
  nomeCliente: string;
  emailCliente?: string | null;
  tokenLoja?: string | null;
}

export interface RespostaPixMercadoPago {
  idTransacao: string;
  copiaECola: string;
  qrCodeBase64: string;
  expiraEm: string;
  status: string;
}

export const TOKEN_MERCADO_PAGO_PADRAO = 'APP_USR-4461777413393257-103017-3e2e1eddb552ac52637936810c55bee1-235139423';

export async function criarCobrancaPixMercadoPago(
  params: ParametrosPixMercadoPago
): Promise<RespostaPixMercadoPago | null> {
  const token =
    params.tokenLoja ||
    process.env.MERCADO_PAGO_ACCESS_TOKEN ||
    TOKEN_MERCADO_PAGO_PADRAO;

  if (!token) {
    return null;
  }

  const valorReais = Number((params.valorCentavos / 100).toFixed(2));
  const partesNome = (params.nomeCliente || 'Cliente').trim().split(' ');
  const primeiroNome = partesNome[0] || 'Cliente';
  const sobrenome = partesNome.slice(1).join(' ') || 'Delivery';
  const emailValido =
    params.emailCliente && params.emailCliente.includes('@')
      ? params.emailCliente
      : `cliente_${Date.now()}@kodfood.app`;

  // Expiração: 30 minutos a partir de agora
  const dataExpiracao = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kodfood.vercel.app';
  const notificationUrl = `${baseUrl.replace(/\/$/, '')}/api/pagamentos/pix-webhook`;

  const bodyPayload = {
    transaction_amount: valorReais,
    description: params.descricao.substring(0, 100),
    payment_method_id: 'pix',
    payer: {
      email: emailValido,
      first_name: primeiroNome,
      last_name: sobrenome,
    },
    notification_url: notificationUrl,
    date_of_expiration: dataExpiracao,
    external_reference: params.idPedido,
  };

  try {
    const res = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `pix-${params.idPedido}-${Date.now()}`,
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!res.ok) {
      const erroTexto = await res.text();
      console.warn('Erro na resposta do Mercado Pago ao gerar PIX:', res.status, erroTexto);
      return null;
    }

    const dados = await res.json();
    const transactionData = dados?.point_of_interaction?.transaction_data;

    if (!transactionData?.qr_code) {
      console.warn('Mercado Pago não retornou dados de QR Code PIX:', dados);
      return null;
    }

    return {
      idTransacao: String(dados.id),
      copiaECola: transactionData.qr_code,
      qrCodeBase64: transactionData.qr_code_base64 || '',
      expiraEm: dados.date_of_expiration || dataExpiracao,
      status: dados.status || 'pending',
    };
  } catch (err) {
    console.warn('Falha na comunicação com a API do Mercado Pago:', err);
    return null;
  }
}

export async function consultarCobrancaPixMercadoPago(
  idTransacao: string,
  tokenLoja?: string | null
): Promise<{ status: string; pago: boolean; valorCentavos: number; idPedido?: string } | null> {
  const token =
    tokenLoja ||
    process.env.MERCADO_PAGO_ACCESS_TOKEN ||
    TOKEN_MERCADO_PAGO_PADRAO;
  if (!token || !idTransacao) return null;

  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${idTransacao}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return null;

    const dados = await res.json();
    const status = dados.status || '';
    const pago = status === 'approved';
    const valorCentavos = Math.round(Number(dados.transaction_amount || 0) * 100);

    return {
      status,
      pago,
      valorCentavos,
      idPedido: dados.external_reference,
    };
  } catch (err) {
    console.warn('Falha ao consultar transação no Mercado Pago:', err);
    return null;
  }
}
