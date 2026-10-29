import Link from 'next/link';
import { ShoppingBag, ArrowLeft } from 'lucide-react';

interface SacolaVaziaProps {
  lojaLink: string;
  corLoja: string;
}

export function SacolaVazia({ lojaLink, corLoja }: SacolaVaziaProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 mb-4">
        <ShoppingBag className="h-8 w-8 stroke-[1.5]" />
      </div>

      <h2 className="font-titulo text-lg font-bold text-neutro-texto">
        Sua sacola está vazia
      </h2>

      <p className="mt-1.5 max-w-xs text-xs text-neutro-secundario leading-relaxed">
        Você ainda não escolheu nenhum item. Dê uma olhada no cardápio e adicione o que tiver vontade!
      </p>

      <Link
        href={`/${lojaLink}`}
        className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-95"
        style={{ backgroundColor: corLoja }}
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Voltar ao cardápio</span>
      </Link>
    </div>
  );
}
