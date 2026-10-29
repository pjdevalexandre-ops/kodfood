'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { X, Plus, Minus, Check } from 'lucide-react';
import { Produto, GrupoDeAdicionais, Adicional } from '@/tipos';
import { formatarPreco } from '@/utilitarios/formatadores';

interface ModalDoProdutoProps {
  produto: Produto;
  gruposDeAdicionais: GrupoDeAdicionais[];
  corLoja: string;
  aoFechar: () => void;
  aoAdicionar: (
    produto: Produto,
    adicionais: Adicional[],
    quantidade: number,
    observacao?: string
  ) => void;
}

export function ModalDoProduto({
  produto,
  gruposDeAdicionais,
  corLoja,
  aoFechar,
  aoAdicionar,
}: ModalDoProdutoProps) {
  const [quantidade, setQuantidade] = useState<number>(1);
  const [observacao, setObservacao] = useState<string>('');
  const [adicionaisEscolhidosPorGrupo, setAdicionaisEscolhidosPorGrupo] = useState<
    Record<string, string[]>
  >(() => {
    const inicial: Record<string, string[]> = {};
    gruposDeAdicionais.forEach((grupo) => {
      inicial[grupo.id] = [];
    });
    return inicial;
  });

  // Manipulação de escolha em grupo com maximo === 1 (rádio)
  const selecionarOpcaoUnica = (grupoId: string, adicionalId: string) => {
    setAdicionaisEscolhidosPorGrupo((anterior) => ({
      ...anterior,
      [grupoId]: [adicionalId],
    }));
  };

  // Manipulação de escolha múltipla (checkbox) com limite maximo
  const alternarOpcaoMultipla = (grupo: GrupoDeAdicionais, adicionalId: string) => {
    setAdicionaisEscolhidosPorGrupo((anterior) => {
      const atuais = anterior[grupo.id] || [];
      const jaSelecionado = atuais.includes(adicionalId);

      if (jaSelecionado) {
        return {
          ...anterior,
          [grupo.id]: atuais.filter((id) => id !== adicionalId),
        };
      }

      if (atuais.length < grupo.maximo) {
        return {
          ...anterior,
          [grupo.id]: [...atuais, adicionalId],
        };
      }

      return anterior;
    });
  };

  // Coleta todos os adicionais selecionados de todos os grupos
  const todosAdicionaisSelecionados: Adicional[] = useMemo(() => {
    const lista: Adicional[] = [];
    gruposDeAdicionais.forEach((grupo) => {
      const ids = adicionaisEscolhidosPorGrupo[grupo.id] || [];
      grupo.adicionais?.forEach((ad) => {
        if (ids.includes(ad.id)) {
          lista.push(ad);
        }
      });
    });
    return lista;
  }, [gruposDeAdicionais, adicionaisEscolhidosPorGrupo]);

  // Validação: todos os grupos devem cumprir o mínimo obrigatório
  const regrasCumpridas = useMemo(() => {
    return gruposDeAdicionais.every((grupo) => {
      const qtdEscolhida = (adicionaisEscolhidosPorGrupo[grupo.id] || []).length;
      return qtdEscolhida >= grupo.minimo && qtdEscolhida <= grupo.maximo;
    });
  }, [gruposDeAdicionais, adicionaisEscolhidosPorGrupo]);

  // Cálculos de preço em centavos
  const somaAdicionaisCentavos = todosAdicionaisSelecionados.reduce(
    (acumulado, ad) => acumulado + ad.preco_centavos,
    0
  );
  const precoUnitarioFinalCentavos = produto.preco_centavos + somaAdicionaisCentavos;
  const precoTotalCentavos = precoUnitarioFinalCentavos * quantidade;

  const lidarComEnvio = () => {
    if (!regrasCumpridas) return;
    aoAdicionar(produto, todosAdicionaisSelecionados, quantidade, observacao);
    aoFechar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      {/* Backdrop clicável para fechar */}
      <div className="fixed inset-0" onClick={aoFechar} />

      {/* Conteúdo da Folha / Painel */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl overflow-hidden">
        {/* Botão de Fechar */}
        <button
          onClick={aoFechar}
          aria-label="Fechar"
          className="absolute right-3.5 top-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-stone-700 shadow-sm backdrop-blur-sm hover:bg-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Área rolável do produto */}
        <div className="flex-1 overflow-y-auto">
          {/* Foto grande (se houver) */}
          {produto.foto_url && (
            <div className="relative h-52 w-full bg-stone-100">
              <Image
                src={produto.foto_url}
                alt={produto.nome}
                fill
                priority
                className="object-cover"
              />
            </div>
          )}

          <div className="p-5">
            {/* Título e descrição */}
            <h2 className="font-titulo text-xl font-bold text-neutro-texto">
              {produto.nome}
            </h2>

            {produto.descricao && (
              <p className="mt-1.5 text-xs text-neutro-secundario leading-relaxed">
                {produto.descricao}
              </p>
            )}

            <div className="mt-2 text-sm font-semibold text-neutro-texto">
              A partir de {formatarPreco(produto.preco_centavos)}
            </div>

            {/* Grupos de adicionais */}
            {gruposDeAdicionais.length > 0 && (
              <div className="mt-6 space-y-6">
                {gruposDeAdicionais.map((grupo) => {
                  const escolhidos = adicionaisEscolhidosPorGrupo[grupo.id] || [];
                  const eOpcaoUnica = grupo.maximo === 1;
                  const eObrigatorio = grupo.minimo >= 1;

                  let avisoRegra = '';
                  if (eOpcaoUnica) {
                    avisoRegra = eObrigatorio ? 'Escolha 1 opção' : 'Escolha até 1 opção';
                  } else {
                    avisoRegra = `Escolha até ${grupo.maximo} opções`;
                  }

                  const faltamObrigatorios = escolhidos.length < grupo.minimo;

                  return (
                    <div
                      key={grupo.id}
                      className="rounded-xl border border-neutro-borda bg-stone-50/70 p-4"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-xs text-neutro-texto">
                          {grupo.nome}
                        </h3>
                        {eObrigatorio && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                              faltamObrigatorios
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {faltamObrigatorios ? 'Obrigatório' : 'OK'}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-neutro-suave mb-3">
                        {avisoRegra}
                      </p>

                      <div className="space-y-2">
                        {grupo.adicionais?.map((adicional) => {
                          const estaMarcado = escolhidos.includes(adicional.id);

                          return (
                            <div
                              key={adicional.id}
                              onClick={() => {
                                if (eOpcaoUnica) {
                                  selecionarOpcaoUnica(grupo.id, adicional.id);
                                } else {
                                  alternarOpcaoMultipla(grupo, adicional.id);
                                }
                              }}
                              className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 text-xs transition-colors ${
                                estaMarcado
                                  ? 'border-stone-800 bg-white shadow-sm'
                                  : 'border-neutro-borda bg-white hover:border-stone-400'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`flex h-4 w-4 items-center justify-center rounded transition-colors ${
                                    eOpcaoUnica ? 'rounded-full' : 'rounded'
                                  } ${
                                    estaMarcado
                                      ? 'text-white'
                                      : 'border border-stone-300'
                                  }`}
                                  style={
                                    estaMarcado
                                      ? { backgroundColor: corLoja }
                                      : undefined
                                  }
                                >
                                  {estaMarcado && (
                                    <Check className="h-3 w-3 stroke-[3]" />
                                  )}
                                </div>
                                <span className="font-medium text-neutro-texto">
                                  {adicional.nome}
                                </span>
                              </div>

                              <span className="font-medium text-neutro-secundario">
                                {adicional.preco_centavos > 0
                                  ? `+ ${formatarPreco(adicional.preco_centavos)}`
                                  : 'Grátis'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Campo de observação */}
            <div className="mt-5">
              <label
                htmlFor="campo-observacao"
                className="block text-xs font-semibold text-neutro-texto mb-1"
              >
                Alguma observação?
              </label>
              <textarea
                id="campo-observacao"
                rows={2}
                maxLength={140}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex.: sem cebola, maionese à parte, cortar ao meio..."
                className="w-full resize-none rounded-lg border border-neutro-borda p-3 text-xs text-neutro-texto placeholder-stone-400 focus:border-stone-800 focus:outline-none"
              />
              <span className="mt-1 block text-right text-[10px] text-neutro-suave">
                {observacao.length}/140
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé fixo com quantidade e botão de adicionar */}
        <div className="border-t border-neutro-borda bg-white p-4">
          <div className="flex items-center gap-3">
            {/* Seletor de quantidade com toque confortável */}
            <div className="flex items-center rounded-lg border border-neutro-borda bg-stone-50">
              <button
                type="button"
                onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                disabled={quantidade <= 1}
                aria-label="Diminuir quantidade"
                className="flex h-11 w-11 items-center justify-center text-stone-700 disabled:opacity-30 hover:bg-stone-100 rounded-l-lg transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-xs font-bold text-neutro-texto">
                {quantidade}
              </span>
              <button
                type="button"
                onClick={() => setQuantidade((q) => Math.min(50, q + 1))}
                aria-label="Aumentar quantidade"
                className="flex h-11 w-11 items-center justify-center text-stone-700 hover:bg-stone-100 rounded-r-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Botão de adicionar à sacola com valor somado */}
            <button
              type="button"
              onClick={lidarComEnvio}
              disabled={!regrasCumpridas}
              className="flex h-11 flex-1 items-center justify-between rounded-lg px-4 text-xs font-semibold text-white shadow-sm transition-opacity disabled:opacity-40"
              style={{ backgroundColor: corLoja }}
            >
              <span>{regrasCumpridas ? 'Adicionar à sacola' : 'Selecione os obrigatórios'}</span>
              <span>{formatarPreco(precoTotalCentavos)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
