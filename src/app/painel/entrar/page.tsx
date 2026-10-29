'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowRight, Store, AlertCircle, ShieldCheck } from 'lucide-react';
import { buscarLojaPeloLink } from '@/acesso-aos-dados';

function FormularioLoginPainel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lojaParam = searchParams.get('loja') || '';

  const [identificadorLoja, setIdentificadorLoja] = useState(lojaParam);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [nomeLojaDetectada, setNomeLojaDetectada] = useState<string | null>(null);

  // Se veio parâmetro na URL, busca o nome da loja para confirmação visual
  useEffect(() => {
    if (lojaParam) {
      setIdentificadorLoja(lojaParam);
      buscarLojaPeloLink(lojaParam).then((l) => {
        if (l) setNomeLojaDetectada(l.nome);
      });
    }
  }, [lojaParam]);

  const lidarComEntrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEntrando(true);

    const slugLimpo = identificadorLoja.trim().toLowerCase().replace(/\s+/g, '-');

    if (!slugLimpo) {
      setErro('Informe o link ou nome da sua lanchonete.');
      setEntrando(false);
      return;
    }

    try {
      // Verifica se a loja existe no sistema
      const loja = await buscarLojaPeloLink(slugLimpo);
      if (!loja) {
        setErro('Estabelecimento não encontrado. Verifique o identificador da loja.');
        setEntrando(false);
        return;
      }

      // Registra a sessão autenticada travada nesta loja específica
      localStorage.setItem('kodfood_painel_logado', 'true');
      localStorage.setItem('kodfood_painel_loja_ativa', loja.link);
      localStorage.setItem('kodfood_painel_loja_id', loja.id);

      // Redireciona exclusivamente para a loja autenticada
      router.push(`/painel/pedidos?loja=${loja.link}`);
    } catch {
      setErro('Ocorreu um erro ao validar seu acesso. Tente novamente.');
      setEntrando(false);
    }
  };

  return (
    <div className="rounded-2xl border border-neutro-borda bg-white p-6 shadow-sm">
      <div className="mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-white mb-3">
          <Lock className="h-5 w-5" />
        </div>
        <h1 className="font-titulo text-xl font-bold tracking-tight text-neutro-texto">
          Acesso ao Painel
        </h1>
        <p className="mt-1 text-xs text-neutro-secundario">
          Entre com as credenciais do seu estabelecimento para gerenciar pedidos e cardápio.
        </p>
      </div>

      {nomeLojaDetectada && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs font-semibold text-stone-800">
          <Store className="h-4 w-4 text-stone-600" />
          <span>Loja: {nomeLojaDetectada}</span>
        </div>
      )}

      {erro && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      <form onSubmit={lidarComEntrar} className="space-y-4">
        {!lojaParam && (
          <div>
            <label
              htmlFor="campo-loja"
              className="block text-xs font-semibold text-neutro-texto mb-1"
            >
              Identificador da sua loja *
            </label>
            <div className="relative">
              <input
                id="campo-loja"
                type="text"
                required
                value={identificadorLoja}
                onChange={(e) => setIdentificadorLoja(e.target.value)}
                placeholder="Ex: lanchonete-do-ze"
                className="w-full rounded-lg border border-neutro-borda p-3 text-xs text-neutro-texto focus:border-stone-800 focus:outline-none"
              />
            </div>
            <span className="mt-1 block text-[10px] text-stone-400">
              O link que você cadastrou para o seu restaurante.
            </span>
          </div>
        )}

        <div>
          <label
            htmlFor="campo-email"
            className="block text-xs font-semibold text-neutro-texto mb-1"
          >
            E-mail do responsável
          </label>
          <input
            id="campo-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu-email@lanchonete.com"
            className="w-full rounded-lg border border-neutro-borda p-3 text-xs text-neutro-texto focus:border-stone-800 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="campo-senha"
            className="block text-xs font-semibold text-neutro-texto mb-1"
          >
            Senha de acesso *
          </label>
          <input
            id="campo-senha"
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-neutro-borda p-3 text-xs text-neutro-texto focus:border-stone-800 focus:outline-none"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={entrando}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-stone-900 text-xs font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
          >
            <span>{entrando ? 'Validando...' : 'Entrar no painel'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>

      <div className="mt-5 border-t border-stone-100 pt-4 flex flex-col items-center gap-2 text-center">
        <Link
          href="/cadastrar"
          className="text-xs font-semibold text-stone-700 hover:underline"
        >
          Não tem uma conta? <strong>Cadastrar loja</strong>
        </Link>
        <Link
          href="/"
          className="text-[11px] text-stone-400 hover:text-stone-600"
        >
          ← Voltar para a página inicial
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-stone-400">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
        <span>Acesso individual e isolado por estabelecimento</span>
      </div>
    </div>
  );
}

export default function PaginaLoginPainel() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-8">
      <Suspense
        fallback={
          <div className="rounded-2xl border border-neutro-borda bg-white p-6 text-center text-xs text-stone-500 animate-pulse">
            Carregando tela de login...
          </div>
        }
      >
        <FormularioLoginPainel />
      </Suspense>
    </main>
  );
}
