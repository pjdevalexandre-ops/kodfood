import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Apenas monitora rotas dentro de /painel/
  if (pathname.startsWith('/painel')) {
    // Permite livre acesso à tela de login
    if (pathname === '/painel/entrar') {
      return NextResponse.next();
    }

    // Verifica cookie de sessão
    const sessaoCookie = request.cookies.get('kodfood_sessao')?.value;

    if (!sessaoCookie) {
      const lojaAtual = searchParams.get('loja') || '';
      const urlDestino = new URL('/painel/entrar', request.url);
      if (lojaAtual) {
        urlDestino.searchParams.set('loja', lojaAtual);
      }
      return NextResponse.redirect(urlDestino);
    }

    // Proteção Multiloja: se a URL especifica uma loja diferente da loja ativa no cookie,
    // redireciona o lojista para a sua própria loja autorizada
    const lojaParam = searchParams.get('loja');
    if (lojaParam && sessaoCookie && decodeURIComponent(sessaoCookie) !== lojaParam) {
      const novaUrl = new URL(request.url);
      novaUrl.searchParams.set('loja', decodeURIComponent(sessaoCookie));
      return NextResponse.redirect(novaUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/painel/:path*'],
};
