'use client';

import { useEffect, useState } from 'react';
import { Categoria } from '@/tipos';

interface NavegacaoDeCategoriasProps {
  categorias: Categoria[];
  corLoja: string;
}

export function NavegacaoDeCategorias({ categorias, corLoja }: NavegacaoDeCategoriasProps) {
  const [categoriaAtivaId, setCategoriaAtivaId] = useState<string>(
    categorias[0]?.id || ''
  );

  useEffect(() => {
    const lidarComScroll = () => {
      const cabecalhoOffset = 110;
      let ativa = categorias[0]?.id || '';

      for (const cat of categorias) {
        const elemento = document.getElementById(`categoria-${cat.id}`);
        if (elemento) {
          const rect = elemento.getBoundingClientRect();
          if (rect.top <= cabecalhoOffset) {
            ativa = cat.id;
          }
        }
      }

      setCategoriaAtivaId(ativa);
    };

    window.addEventListener('scroll', lidarComScroll, { passive: true });
    lidarComScroll();

    return () => {
      window.removeEventListener('scroll', lidarComScroll);
    };
  }, [categorias]);

  const rolarParaCategoria = (id: string) => {
    setCategoriaAtivaId(id);
    const elemento = document.getElementById(`categoria-${id}`);
    if (elemento) {
      const topo = elemento.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({
        top: topo,
        behavior: 'smooth',
      });
    }
  };

  if (categorias.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Categorias do cardápio"
      className="sticky top-0 z-20 border-b border-neutro-borda bg-white/95 backdrop-blur-sm shadow-xs"
    >
      <div className="flex overflow-x-auto px-4 py-2 scrollbar-none gap-2">
        {categorias.map((cat) => {
          const estaAtiva = cat.id === categoriaAtivaId;

          return (
            <button
              key={cat.id}
              onClick={() => rolarParaCategoria(cat.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                estaAtiva
                  ? 'text-white shadow-xs'
                  : 'bg-stone-100 text-neutro-secundario hover:bg-stone-200 hover:text-neutro-texto'
              }`}
              style={estaAtiva ? { backgroundColor: corLoja } : undefined}
            >
              {cat.nome}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
