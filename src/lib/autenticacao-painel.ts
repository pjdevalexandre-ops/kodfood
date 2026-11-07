import { NextRequest, NextResponse } from 'next/server';
import { supabaseServidor } from './supabase-servidor';

export interface ResultadoAutenticacaoPainel {
  autorizado: boolean;
  respostaErro?: NextResponse;
  linkSessao?: string;
}

/**
 * Valida se a requisição possui sessão do painel para a loja informada.
 * Retorna 401 se não autenticado, ou 403 se a sessão pertencer a outra loja.
 */
export async function exigirSessaoDoPainel(
  req: NextRequest,
  lojaIdOuLink?: string | null
): Promise<ResultadoAutenticacaoPainel> {
  const sessaoCookie = req.cookies.get('kodfood_sessao')?.value;

  if (!sessaoCookie) {
    return {
      autorizado: false,
      respostaErro: NextResponse.json(
        { erro: 'Não autenticado. Sessão de lojista necessária.' },
        { status: 401 }
      ),
    };
  }

  const linkSessao = decodeURIComponent(sessaoCookie);

  if (!lojaIdOuLink) {
    return { autorizado: true, linkSessao };
  }

  if (lojaIdOuLink === linkSessao) {
    return { autorizado: true, linkSessao };
  }

  // Se for UUID, verifica a correspondência no banco de dados
  const ehUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lojaIdOuLink);
  if (ehUuid) {
    try {
      const { data: loja } = await supabaseServidor
        .from('lojas')
        .select('link')
        .eq('id', lojaIdOuLink)
        .maybeSingle();

      if (!loja || loja.link !== linkSessao) {
        return {
          autorizado: false,
          respostaErro: NextResponse.json(
            { erro: 'Acesso proibido. A sessão ativa não pertence a esta loja.' },
            { status: 403 }
          ),
        };
      }
    } catch {
      // Fallback em caso de indisponibilidade
    }
  }

  return { autorizado: true, linkSessao };
}
