'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Produto, Adicional } from '@/tipos';
import { ItemSacola } from '@/tipos/sacola';

interface SacolaContextoValor {
  itens: ItemSacola[];
  adicionarItem: (
    produto: Produto,
    adicionais: Adicional[],
    quantidade: number,
    observacao?: string
  ) => void;
  removerItem: (idItemSacola: string) => void;
  alterarQuantidade: (idItemSacola: string, novaQuantidade: number) => void;
  limparSacola: () => void;
  quantidadeTotalItens: number;
  subtotalCentavos: number;
  carregado: boolean;
}

const SacolaContexto = createContext<SacolaContextoValor | null>(null);

export function SacolaProvedor({
  children,
  lojaLink,
}: {
  children: React.ReactNode;
  lojaLink: string;
}) {
  const chaveArmazenamento = `kodfood_sacola_${lojaLink}`;
  const [itens, setItens] = useState<ItemSacola[]>([]);
  const [carregado, setCarregado] = useState(false);

  // Carrega a sacola do localStorage ao iniciar no navegador
  useEffect(() => {
    try {
      const dadosSalvos = localStorage.getItem(chaveArmazenamento);
      if (dadosSalvos) {
        setItens(JSON.parse(dadosSalvos));
      }
    } catch (erro) {
      console.error('Falha ao carregar a sacola do armazenamento local', erro);
    } finally {
      setCarregado(true);
    }
  }, [chaveArmazenamento]);

  // Salva no localStorage sempre que os itens mudam
  const salvarItens = (novosItens: ItemSacola[]) => {
    setItens(novosItens);
    try {
      localStorage.setItem(chaveArmazenamento, JSON.stringify(novosItens));
    } catch (erro) {
      console.error('Falha ao salvar itens da sacola', erro);
    }
  };

  const adicionarItem = (
    produto: Produto,
    adicionais: Adicional[],
    quantidade: number,
    observacao?: string
  ) => {
    const somaAdicionais = adicionais.reduce(
      (acumulado, ad) => acumulado + ad.preco_centavos,
      0
    );
    const precoUnitarioCentavos = produto.preco_centavos + somaAdicionais;
    const precoTotalCentavos = precoUnitarioCentavos * quantidade;

    const novoItem: ItemSacola = {
      idItemSacola: 'item-' + Math.random().toString(36).substring(2, 9),
      produto,
      quantidade,
      observacao: observacao?.trim() || undefined,
      adicionais,
      precoUnitarioCentavos,
      precoTotalCentavos,
    };

    salvarItens([...itens, novoItem]);
  };

  const removerItem = (idItemSacola: string) => {
    const filtrados = itens.filter((i) => i.idItemSacola !== idItemSacola);
    salvarItens(filtrados);
  };

  const alterarQuantidade = (idItemSacola: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      removerItem(idItemSacola);
      return;
    }

    const atualizados = itens.map((item) => {
      if (item.idItemSacola === idItemSacola) {
        return {
          ...item,
          quantidade: novaQuantidade,
          precoTotalCentavos: item.precoUnitarioCentavos * novaQuantidade,
        };
      }
      return item;
    });

    salvarItens(atualizados);
  };

  const limparSacola = () => {
    salvarItens([]);
  };

  const quantidadeTotalItens = itens.reduce(
    (acumulado, item) => acumulado + item.quantidade,
    0
  );

  const subtotalCentavos = itens.reduce(
    (acumulado, item) => acumulado + item.precoTotalCentavos,
    0
  );

  return (
    <SacolaContexto.Provider
      value={{
        itens,
        adicionarItem,
        removerItem,
        alterarQuantidade,
        limparSacola,
        quantidadeTotalItens,
        subtotalCentavos,
        carregado,
      }}
    >
      {children}
    </SacolaContexto.Provider>
  );
}

export function useSacola(): SacolaContextoValor {
  const contexto = useContext(SacolaContexto);
  if (!contexto) {
    throw new Error('useSacola deve ser utilizado dentro de um SacolaProvedor');
  }
  return contexto;
}
