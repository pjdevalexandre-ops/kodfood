export default function CarregandoCardapio() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-neutro-fundo">
      {/* Esqueleto do cabeçalho */}
      <div className="h-28 w-full animate-pulse bg-stone-300" />
      <div className="border-b border-neutro-borda bg-white px-4 pb-4 pt-3">
        <div className="-mt-10 mb-3 flex items-end justify-between">
          <div className="h-16 w-16 animate-pulse rounded-xl border-2 border-white bg-stone-200" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-stone-200" />
        </div>
        <div className="h-5 w-48 animate-pulse rounded bg-stone-200" />
        <div className="mt-2 h-3.5 w-64 animate-pulse rounded bg-stone-100" />
        <div className="mt-3 flex gap-2">
          <div className="h-3 w-28 animate-pulse rounded bg-stone-100" />
          <div className="h-3 w-20 animate-pulse rounded bg-stone-100" />
        </div>
      </div>

      {/* Esqueleto da navegação de categorias */}
      <div className="flex gap-2 border-b border-neutro-borda bg-white px-4 py-2.5">
        <div className="h-6 w-24 animate-pulse rounded-full bg-stone-200" />
        <div className="h-6 w-28 animate-pulse rounded-full bg-stone-100" />
        <div className="h-6 w-20 animate-pulse rounded-full bg-stone-100" />
      </div>

      {/* Esqueleto das linhas de produto */}
      <div className="divide-y divide-stone-100 bg-white">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start justify-between p-4">
            <div className="flex-1 space-y-2 pr-3">
              <div className="h-4 w-40 animate-pulse rounded bg-stone-200" />
              <div className="h-3 w-full animate-pulse rounded bg-stone-100" />
              <div className="h-3.5 w-16 animate-pulse rounded bg-stone-200" />
            </div>
            <div className="h-20 w-20 shrink-0 animate-pulse rounded-lg bg-stone-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
