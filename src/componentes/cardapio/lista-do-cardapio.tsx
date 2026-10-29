'use client';

import { Categoria, Produto } from '@/tipos';
import { LinhaDoProduto } from './linha-do-produto';

interface ListaDoCardapioProps {
  categorias: Categoria[];
  produtos: Produto[];
  lojaAberta: boolean;
  corLoja: string;
  aoSelecionarProduto?: (produto: Produto) => void;
}

export function ListaDoCardapio({
  categorias,
  produtos,
  lojaAberta,
  corLoja,
  aoSelecionarProduto,
}: ListaDoCardapioProps) {
  if (produtos.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-neutro-secundario">
        Nenhum produto cadastrado no momento.
      </div>
    );
  }

  return (
    <div className="pb-16">
      {categorias.map((categoria) => {
        const produtosDaCategoria = produtos.filter(
          (prod) => prod.categoria_id === categoria.id
        );

        if (produtosDaCategoria.length === 0) {
          return null;
        }

        return (
          <section
            key={categoria.id}
            id={`categoria-${categoria.id}`}
            className="scroll-mt-14"
          >
            {/* Cabeçalho da categoria */}
            <div className="bg-neutro-fundo px-4 py-3 border-b border-stone-200/50">
              <h2 className="font-titulo text-sm font-bold tracking-tight text-neutro-texto">
                {categoria.nome}
              </h2>
            </div>

            {/* Linhas de produtos */}
            <div className="divide-y divide-stone-100">
              {produtosDaCategoria.map((produto) => (
                <LinhaDoProduto
                  key={produto.id}
                  produto={produto}
                  lojaAberta={lojaAberta}
                  corLoja={corLoja}
                  aoClicar={aoSelecionarProduto}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
