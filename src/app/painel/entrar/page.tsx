'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowRight, PlusCircle } from 'lucide-react';

export default function PaginaLoginPainel() {
  const router = useRouter();
  const [email, setEmail] = useState('atendente@lanchonete.com');
  const [senha, setSenha] = useState('123456');
  const [lojaEscolhida, setLojaEscolhida] = useState('lanchonete-do-ze');
  const [entrando, setEntrando] = useState(false);
  const [lojasDisponiveis, setLojasDisponiveis] = useState<Array<{ link: string; nome: string }>>([
    { link: 'lanchonete-do-ze', nome: 'Lanchonete do Zé' },
    { link: 'acai-da-ana', nome: 'Açaí da Ana' },
  ]);

  useEffect(() => {
    try {
      const salvas = localStorage.getItem('kodfood_lojas_modificadas');
      if (salvas) {
        const parsed = JSON.parse(salvas);
        const lista = Object.values(parsed).map((item: any) => ({
          link: item.loja.link,
          nome: item.loja.nome,
        }));
        if (lista.length > 0) {
          setLojasDisponiveis(lista);
          if (!lista.some((l) => l.link === lojaEscolhida)) {
            setLojaEscolhida(lista[0].link);
          }
        }
      }
    } catch {}
  }, []);

  const lidarComEntrar = (e: React.FormEvent) => {
    e.preventDefault();
    setEntrando(true);

    try {
      localStorage.setItem('kodfood_painel_logado', 'true');
      localStorage.setItem('kodfood_painel_loja_ativa', lojaEscolhida);
    } catch {}

    setTimeout(() => {
      router.push(`/painel/pedidos?loja=${lojaEscolhida}`);
    }, 250);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-8">
      <div className="rounded-2xl border border-neutro-borda bg-white p-6 shadow-sm">
        <div className="mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-white mb-3">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="font-titulo text-xl font-bold tracking-tight text-neutro-texto">
            Painel da Lanchonete
          </h1>
          <p className="mt-1 text-xs text-neutro-secundario">
            Acompanhe pedidos em tempo real e gerencie a cozinha.
          </p>
        </div>

        <form onSubmit={lidarComEntrar} className="space-y-4">
          <div>
            <label
              htmlFor="campo-loja"
              className="block text-xs font-semibold text-neutro-texto mb-1"
            >
              Selecione a lanchonete
            </label>
            <select
              id="campo-loja"
              value={lojaEscolhida}
              onChange={(e) => setLojaEscolhida(e.target.value)}
              className="w-full rounded-lg border border-neutro-borda bg-white p-3 text-xs text-neutro-texto focus:border-stone-800 focus:outline-none"
            >
              {lojasDisponiveis.map((l) => (
                <option key={l.link} value={l.link}>
                  {l.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="campo-email"
              className="block text-xs font-semibold text-neutro-texto mb-1"
            >
              E-mail da equipe
            </label>
            <input
              id="campo-email"
              type="email"
              required
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
              Senha
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
              <span>{entrando ? 'Entrando...' : 'Entrar no painel'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>

        <div className="mt-5 border-t border-stone-100 pt-4 text-center">
          <Link
            href="/cadastrar"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B4412B] hover:underline"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Cadastrar nova lanchonete</span>
          </Link>
        </div>

        <p className="mt-4 text-center text-[11px] text-neutro-suave">
          Fase 1: acesso liberado com qualquer credencial para testes.
        </p>
      </div>
    </main>
  );
}
