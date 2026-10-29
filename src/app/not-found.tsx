import Link from 'next/link';

export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="rounded-xl border border-neutro-borda bg-white p-8 shadow-sm">
        <h1 className="font-titulo text-2xl font-bold text-neutro-texto">
          Loja não encontrada
        </h1>
        <p className="mt-3 text-sm text-neutro-secundario leading-relaxed">
          O link que você tentou acessar não pertence a nenhuma lanchonete cadastrada ou foi digitado incorretamente.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-neutro-borda bg-stone-50 px-4 py-2.5 text-sm font-medium text-neutro-texto hover:bg-stone-100"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}
