'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Store,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Share2,
  Sparkles,
  UtensilsCrossed,
  Bike,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { cadastrarNovaLoja } from '@/acesso-aos-dados';
import { aplicarMascaraTelefone } from '@/utilitarios/formatadores';

const PALETA_SUGERIDA = [
  { nome: 'Terracota Zé', cor: '#B4412B' },
  { nome: 'Verde Açaí Ana', cor: '#2F6B4F' },
  { nome: 'Vinho Artesanal', cor: '#8B1E3F' },
  { nome: 'Mostarda Queimada', cor: '#C27803' },
  { nome: 'Laranja Brasas', cor: '#D95D39' },
  { nome: 'Azul Noturno', cor: '#1D3557' },
  { nome: 'Carvão Gourmet', cor: '#1C1917' },
];

function gerarSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9]+/g, '-') // substitui caracteres especiais por hífen
    .replace(/^-+|-+$/g, '') // remove hífens das pontas
    .substring(0, 32);
}

export function TelaCadastroLoja() {
  const router = useRouter();

  const [nome, setNome] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [corPrincipal, setCorPrincipal] = useState('#B4412B');

  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [lojaCriada, setLojaCriada] = useState<{ nome: string; link: string; cor: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const lidarComMudancaNome = (valor: string) => {
    setNome(valor);
    if (!slugManual) {
      setSlug(gerarSlug(valor));
    }
  };

  const lidarComMudancaSlug = (valor: string) => {
    setSlugManual(true);
    setSlug(gerarSlug(valor));
  };

  const validarSlug = (texto: string) => {
    return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(texto);
  };

  const lidarComEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!nome.trim()) {
      setErro('Informe o nome da sua lanchonete.');
      return;
    }

    if (!validarSlug(slug)) {
      setErro('O link deve conter apenas letras minúsculas, números e hífens.');
      return;
    }

    if (!nomeResponsavel.trim()) {
      setErro('Informe o nome do responsável.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErro('Informe um e-mail válido.');
      return;
    }

    if (senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setCarregando(true);

    try {
      const novaLoja = await cadastrarNovaLoja({
        nome: nome.trim(),
        link: slug.trim(),
        nomeResponsavel: nomeResponsavel.trim(),
        email: email.trim(),
        telefone: telefone.replace(/\D/g, ''),
        corPrincipal,
      });

      setLojaCriada({
        nome: novaLoja.nome,
        link: novaLoja.link,
        cor: novaLoja.cor_principal,
      });
    } catch (e: any) {
      setErro(e.message || 'Erro ao criar loja.');
    } finally {
      setCarregando(false);
    }
  };

  const copiarLinkLoja = () => {
    if (!lojaCriada) return;
    const url = `${window.location.origin}/${lojaCriada.link}`;
    navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const compartilharWhatsApp = () => {
    if (!lojaCriada) return;
    const url = `${window.location.origin}/${lojaCriada.link}`;
    const texto = encodeURIComponent(
      `Olá! Conheça nosso cardápio online e faça seu pedido direto pelo link: ${url}`
    );
    window.open(`https://wa.me/?text=${texto}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-neutro-texto antialiased flex flex-col justify-between">
      {/* CABEÇALHO */}
      <header className="border-b border-neutro-borda bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-titulo text-xl font-bold tracking-tight text-neutral-900">
              Kod<span className="text-stone-900">Food</span>
            </span>
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-700">
              Criar Lanchonete
            </span>
          </Link>

          <Link
            href="/painel/entrar"
            className="text-xs font-semibold text-stone-600 hover:text-stone-900"
          >
            Já tem uma conta? Entrar
          </Link>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="mx-auto max-w-xl w-full p-4 sm:p-6 my-auto">
        {lojaCriada ? (
          /* TELA DE ONBOARDING E SUCESSO */
          <div className="rounded-2xl border border-neutro-borda bg-white p-6 sm:p-8 shadow-xs space-y-6 text-center animate-fade-in">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-xs"
              style={{ backgroundColor: lojaCriada.cor }}
            >
              <Sparkles className="h-8 w-8" />
            </div>

            <div>
              <h1 className="font-titulo text-2xl font-bold text-neutro-texto">
                Lanchonete criada com sucesso!
              </h1>
              <p className="mt-1 text-xs text-neutro-secundario">
                Bem-vindo ao KodFood. Seu cardápio digital já está pronto para ser configurado.
              </p>
            </div>

            {/* CAIXA COM LINK DA LOJA */}
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-left space-y-2">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Link do seu cardápio:
              </span>
              <div className="flex items-center justify-between gap-2 bg-white rounded-lg border border-stone-200 p-2.5">
                <span className="font-mono text-xs text-stone-800 truncate">
                  {typeof window !== 'undefined' ? window.location.origin : 'kodfood.com.br'}/{lojaCriada.link}
                </span>

                <button
                  type="button"
                  onClick={copiarLinkLoja}
                  className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition-all bg-stone-100 text-stone-700 hover:bg-stone-200 shrink-0"
                >
                  {copiado ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={compartilharWhatsApp}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                >
                  <Share2 className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Compartilhar no WhatsApp</span>
                </button>

                <a
                  href={`/${lojaCriada.link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  <span>Ver Cardápio</span>
                  <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
                </a>
              </div>
            </div>

            {/* 3 PASSOS DE ONBOARDING */}
            <div className="rounded-xl border border-stone-100 bg-white p-4 text-left space-y-3">
              <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                Próximos passos recomendados:
              </span>

              <div className="space-y-2.5 text-xs text-stone-700">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 font-bold text-stone-800 shrink-0">
                    1
                  </div>
                  <div>
                    <strong className="block font-semibold">Cadastre seus primeiros produtos</strong>
                    <span className="text-stone-500 text-[11px]">
                      Adicione fotos, preços e opções de adicionais no seu cardápio.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 font-bold text-stone-800 shrink-0">
                    2
                  </div>
                  <div>
                    <strong className="block font-semibold">Configure os bairros de entrega</strong>
                    <span className="text-stone-500 text-[11px]">
                      Defina onde sua lanchonete entrega e as respectivas taxas.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 font-bold text-stone-800 shrink-0">
                    3
                  </div>
                  <div>
                    <strong className="block font-semibold">Abra a loja e receba pedidos</strong>
                    <span className="text-stone-500 text-[11px]">
                      Divulgue o link no WhatsApp e Instagram para seus clientes pedirem.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTÃO PARA ACESSAR O PAINEL */}
            <Link
              href={`/painel/cardapio?loja=${lojaCriada.link}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-xs hover:opacity-95 transition-opacity"
              style={{ backgroundColor: lojaCriada.cor }}
            >
              <span>Acessar Painel e Cadastrar Produtos</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          /* FORMULÁRIO DE CADASTRO */
          <div className="rounded-2xl border border-neutro-borda bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-1">
              <h1 className="font-titulo text-xl sm:text-2xl font-bold text-neutro-texto">
                Cadastre sua Lanchonete
              </h1>
              <p className="text-xs text-neutro-secundario">
                Crie seu cardápio digital próprio e comece a vender sem taxas abusivas.
              </p>
            </div>

            {erro && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800">
                {erro}
              </div>
            )}

            <form onSubmit={lidarComEnvio} className="space-y-4">
              {/* Nome da Loja */}
              <div>
                <label className="block text-xs font-semibold text-neutro-texto mb-1">
                  Nome da Lanchonete / Restaurante *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => lidarComMudancaNome(e.target.value)}
                  placeholder="Ex.: Burguer da Villa"
                  className="w-full rounded-xl border border-neutro-borda p-3 text-xs focus:border-stone-800 focus:outline-none"
                />
              </div>

              {/* Link amigável / Slug */}
              <div>
                <label className="block text-xs font-semibold text-neutro-texto mb-1">
                  Link do seu cardápio (slug da URL) *
                </label>
                <div className="flex items-center rounded-xl border border-neutro-borda px-3 py-1 bg-white focus-within:border-stone-800">
                  <span className="text-xs text-stone-400 select-none">
                    kodfood.com.br/
                  </span>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => lidarComMudancaSlug(e.target.value)}
                    placeholder="burguer-da-villa"
                    className="w-full p-2 text-xs font-semibold text-stone-900 border-0 focus:outline-none bg-transparent"
                  />
                </div>
                <p className="mt-1 text-[11px] text-neutro-secundario">
                  Apenas letras minúsculas, números e hífens. Seus clientes acessarão por este link.
                </p>
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-xs font-semibold text-neutro-texto mb-1">
                  WhatsApp da Loja (para receber pedidos)
                </label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(aplicarMascaraTelefone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full rounded-xl border border-neutro-borda p-3 text-xs focus:border-stone-800 focus:outline-none"
                />
              </div>

              {/* Nome do Responsável */}
              <div>
                <label className="block text-xs font-semibold text-neutro-texto mb-1">
                  Seu Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={nomeResponsavel}
                  onChange={(e) => setNomeResponsavel(e.target.value)}
                  placeholder="Ex.: João da Silva"
                  className="w-full rounded-xl border border-neutro-borda p-3 text-xs focus:border-stone-800 focus:outline-none"
                />
              </div>

              {/* Email e Senha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutro-texto mb-1">
                    E-mail de Acesso *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="joao@exemplo.com"
                    className="w-full rounded-xl border border-neutro-borda p-3 text-xs focus:border-stone-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutro-texto mb-1">
                    Senha de Acesso *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 6 dígitos"
                    className="w-full rounded-xl border border-neutro-borda p-3 text-xs focus:border-stone-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Cor Principal / Identidade Visual */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-neutro-texto mb-2">
                  Cor do seu Cardápio:
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  {PALETA_SUGERIDA.map((item) => (
                    <button
                      key={item.cor}
                      type="button"
                      onClick={() => setCorPrincipal(item.cor)}
                      className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-all ${
                        corPrincipal.toLowerCase() === item.cor.toLowerCase()
                          ? 'border-stone-900 bg-stone-50 ring-2 ring-stone-900/20'
                          : 'border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.cor }}
                      />
                      <span>{item.nome}</span>
                    </button>
                  ))}

                  <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 px-2.5 py-1 bg-white">
                    <span className="text-[11px] text-stone-600 font-medium">Outra:</span>
                    <input
                      type="color"
                      value={corPrincipal}
                      onChange={(e) => setCorPrincipal(e.target.value)}
                      className="h-5 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                  </div>
                </div>
              </div>

              {/* Botão de Submissão */}
              <button
                type="submit"
                disabled={carregando}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50 mt-6"
                style={{ backgroundColor: corPrincipal }}
              >
                <span>{carregando ? 'Criando sua lanchonete...' : 'Criar Cardápio Digital'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </main>

      {/* RODAPÉ */}
      <footer className="border-t border-neutro-borda bg-white py-4 px-4 text-center text-xs text-neutro-secundario">
        KodFood · O sistema simples e direto para sua lanchonete vender online.
      </footer>
    </div>
  );
}
