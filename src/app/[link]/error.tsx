'use client';

interface ErroProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErroNoCardapio({ reset }: ErroProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6 text-center">
      <div className="rounded-xl border border-neutro-borda bg-white p-6 shadow-sm">
        <h1 className="font-titulo text-xl font-bold text-neutro-texto">
          Não conseguimos carregar o cardápio
        </h1>
        <p className="mt-2 text-xs text-neutro-secundario leading-relaxed">
          Ocorreu uma instabilidade momentânea ao buscar as informações da loja.
        </p>
        <button
          onClick={() => reset()}
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 active:scale-95"
        >
          Tentar de novo
        </button>
      </div>
    </main>
  );
}
