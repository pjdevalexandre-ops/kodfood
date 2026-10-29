import Link from 'next/link';

export default function PaginaInicial() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <div className="rounded-xl border border-neutro-borda bg-white p-6 shadow-sm">
        <h1 className="font-titulo text-2xl font-bold tracking-tight text-neutro-texto">
          KodFood
        </h1>
        <p className="mt-2 text-sm text-neutro-secundario">
          Sistema de pedidos para lanchonetes e restaurantes. Selecione uma loja de exemplo para abrir o cardápio:
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/lanchonete-do-ze"
            className="flex items-center justify-between rounded-lg border border-neutro-borda p-4 transition-colors hover:border-[#B4412B] hover:bg-[#B4412B]/5"
          >
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: '#B4412B' }}
                />
                <h2 className="font-semibold text-neutro-texto">Lanchonete do Zé</h2>
              </div>
              <p className="mt-1 text-xs text-neutro-secundario">
                Hambúrgueres na brasa e porções · Tema Terracota
              </p>
            </div>
            <span className="text-xs font-medium text-[#B4412B]">Abrir →</span>
          </Link>

          <Link
            href="/acai-da-ana"
            className="flex items-center justify-between rounded-lg border border-neutro-borda p-4 transition-colors hover:border-[#2F6B4F] hover:bg-[#2F6B4F]/5"
          >
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: '#2F6B4F' }}
                />
                <h2 className="font-semibold text-neutro-texto">Açaí da Ana</h2>
              </div>
              <p className="mt-1 text-xs text-neutro-secundario">
                Açaí do Pará, tigelas e sucos · Tema Verde Folha
              </p>
            </div>
            <span className="text-xs font-medium text-[#2F6B4F]">Abrir →</span>
          </Link>
        </div>

        <div className="mt-6 border-t border-neutro-borda pt-4 space-y-3">
          <Link
            href="/painel/pedidos"
            className="flex items-center justify-between rounded-lg bg-stone-900 px-4 py-3 text-xs font-bold text-white hover:bg-stone-800 transition-colors"
          >
            <span>Acessar Painel de Pedidos (Cozinha)</span>
            <span>Abrir →</span>
          </Link>

          <Link
            href="/cadastrar"
            className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-xs font-bold text-stone-800 hover:bg-stone-100 transition-colors"
          >
            <span>+ Cadastrar Nova Lanchonete</span>
            <span>Criar →</span>
          </Link>

          <p className="text-xs text-neutro-secundario">
            Ambiente da fase 1: dados de exemplo locais, sem necessidade de banco de dados externo.
          </p>
        </div>
      </div>
    </main>
  );
}
