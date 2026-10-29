import Image from 'next/image';
import { Loja, HorarioFuncionamento } from '@/tipos';
import { formatarPreco, obterStatusLoja } from '@/utilitarios/formatadores';

interface CabecalhoDaLojaProps {
  loja: Loja;
  horarios?: HorarioFuncionamento[];
}

export function CabecalhoDaLoja({ loja, horarios = [] }: CabecalhoDaLojaProps) {
  const status = obterStatusLoja(loja.aberta, horarios);

  return (
    <header className="border-b border-neutro-borda bg-white">
      {/* Capa da loja ou bloco liso na cor da loja */}
      <div
        className="relative h-28 w-full overflow-hidden"
        style={{ backgroundColor: loja.cor_principal }}
      >
        {loja.capa_url && (
          <Image
            src={loja.capa_url}
            alt={loja.nome}
            fill
            className="object-cover"
            priority
          />
        )}
      </div>

      <div className="relative px-4 pb-4 pt-3">
        {/* Logo flutuante sobreposta à capa */}
        <div className="-mt-10 mb-3 flex items-end justify-between">
          <div className="relative h-16 w-16 overflow-hidden rounded-xl border-2 border-white bg-white shadow-sm">
            {loja.logo_url ? (
              <Image
                src={loja.logo_url}
                alt={loja.nome}
                fill
                className="object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center font-titulo text-2xl font-bold text-white"
                style={{ backgroundColor: loja.cor_principal }}
              >
                {loja.nome.charAt(0)}
              </div>
            )}
          </div>

          {/* Badge de situação da loja */}
          <div className="flex items-center gap-1.5 rounded-full border border-neutro-borda bg-stone-50 px-3 py-1 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                status.aberta ? 'bg-emerald-600' : 'bg-stone-400'
              }`}
            />
            <span className="font-medium text-neutro-texto">{status.rotulo}</span>
          </div>
        </div>

        {/* Nome e descrição */}
        <h1 className="font-titulo text-xl font-bold tracking-tight text-neutro-texto">
          {loja.nome}
        </h1>

        {loja.descricao && (
          <p className="mt-1 text-xs text-neutro-secundario leading-relaxed">
            {loja.descricao}
          </p>
        )}

        {/* Informações de entrega, retirada e pedido mínimo */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutro-secundario">
          {loja.aceita_entrega && loja.aceita_retirada && (
            <span>Entrega e Retirada</span>
          )}
          {loja.aceita_entrega && !loja.aceita_retirada && (
            <span>Somente Entrega</span>
          )}
          {!loja.aceita_entrega && loja.aceita_retirada && (
            <span>Somente Retirada</span>
          )}

          <span className="text-stone-300">·</span>

          <span>
            Mínimo {formatarPreco(loja.pedido_minimo_centavos)}
          </span>

          {status.mensagem && (
            <>
              <span className="text-stone-300">·</span>
              <span className={status.aberta ? 'text-neutro-secundario' : 'font-medium text-amber-800'}>
                {status.mensagem}
              </span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
