'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Sliders,
  Store,
  Layers,
  UtensilsCrossed,
  ArrowLeft,
  Camera,
} from 'lucide-react';
import { Loja, Categoria, Produto, GrupoDeAdicionais, ProdutoGrupo } from '@/tipos';
import {
  salvarProduto,
  excluirProduto,
  alternarDisponibilidadeProduto,
  reordenarProdutos,
  salvarCategoria,
  excluirCategoria,
  salvarGrupoDeAdicionais,
  excluirGrupoDeAdicionais,
  salvarAdicional,
  excluirAdicional,
  buscarLojaPeloLink,
  obterCardapioCompletoParaPainel,
} from '@/acesso-aos-dados';
import { formatarPreco } from '@/utilitarios/formatadores';
import { FormularioProdutoModal } from './formulario-produto-modal';
import { FormularioCategoriaModal } from './formulario-categoria-modal';
import { GestaoAdicionaisModal } from './gestao-adicionais-modal';
import { NavegacaoPainel } from './navegacao-painel';

interface TelaCardapioPainelProps {
  lojaInicial: Loja;
  categoriasIniciais: Categoria[];
  produtosIniciais: Produto[];
  gruposIniciais: GrupoDeAdicionais[];
  produtoGruposIniciais: ProdutoGrupo[];
}

export function TelaCardapioPainel({
  lojaInicial,
  categoriasIniciais,
  produtosIniciais,
  gruposIniciais,
  produtoGruposIniciais,
}: TelaCardapioPainelProps) {
  const [loja, setLoja] = useState<Loja>(lojaInicial);
  const [categorias, setCategorias] = useState<Categoria[]>(categoriasIniciais);
  const [produtos, setProdutos] = useState<Produto[]>(produtosIniciais);
  const [grupos, setGrupos] = useState<GrupoDeAdicionais[]>(gruposIniciais);
  const [produtoGrupos, setProdutoGrupos] = useState<ProdutoGrupo[]>(produtoGruposIniciais);

  const searchParams = useSearchParams();
  const slug = searchParams.get('loja') || lojaInicial.link;

  // Sincroniza com alterações salvas no navegador ou nova loja criada
  useEffect(() => {
    if (!slug) return;
    buscarLojaPeloLink(slug).then(async (l) => {
      if (l) {
        setLoja(l);
        const dados = await obterCardapioCompletoParaPainel(l.id);
        if (dados) {
          setCategorias(dados.categorias);
          setProdutos(dados.produtos);
          setGrupos(dados.gruposDeAdicionais);
          setProdutoGrupos(dados.produtoGrupos);
        }
      }
    });
  }, [slug]);

  // Estados dos modais
  const [modalProdutoAberto, setModalProdutoAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);

  const [modalCategoriaAberto, setModalCategoriaAberto] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);

  const [modalGruposAberto, setModalGruposAberto] = useState(false);

  // Ações de Produto
  const lidarComSalvarProduto = async (dados: {
    id?: string;
    categoria_id: string | null;
    nome: string;
    descricao?: string | null;
    preco_centavos: number;
    foto_url?: string | null;
    disponivel?: boolean;
    gruposIds: string[];
    controlar_estoque?: boolean;
    quantidade_estoque?: number;
    estoque_minimo?: number;
  }) => {
    try {
      const salvo = await salvarProduto(loja.id, dados);
      setProdutos((anteriores) => {
        const existe = anteriores.some((p) => p.id === salvo.id);
        if (existe) {
          return anteriores.map((p) => (p.id === salvo.id ? salvo : p));
        }
        return [...anteriores, salvo];
      });

      // Atualiza vínculos de grupos
      setProdutoGrupos((anteriores) => {
        const limpos = anteriores.filter((pg) => pg.produto_id !== salvo.id);
        const novos = dados.gruposIds.map((gid) => ({
          loja_id: loja.id,
          produto_id: salvo.id,
          grupo_id: gid,
        }));
        return [...limpos, ...novos];
      });
    } catch (e) {
      console.error('Erro ao salvar produto', e);
    }
  };

  const lidarComExcluirProduto = async (produtoId: string) => {
    try {
      await excluirProduto(loja.id, produtoId);
      setProdutos((anteriores) => anteriores.filter((p) => p.id !== produtoId));
      setProdutoGrupos((anteriores) =>
        anteriores.filter((pg) => pg.produto_id !== produtoId)
      );
    } catch (e) {
      console.error('Erro ao excluir produto', e);
    }
  };

  const lidarComAlternarDisponivel = async (
    produtoId: string,
    novoStatus: boolean
  ) => {
    try {
      await alternarDisponibilidadeProduto(loja.id, produtoId, novoStatus);
      setProdutos((anteriores) =>
        anteriores.map((p) =>
          p.id === produtoId ? { ...p, disponivel: novoStatus } : p
        )
      );
    } catch (e) {
      console.error('Erro ao alternar status do produto', e);
    }
  };

  const lidarComReordenarProduto = async (
    categoriaId: string,
    direcao: 'subir' | 'descer',
    produtoId: string
  ) => {
    try {
      await reordenarProdutos(loja.id, categoriaId, direcao, produtoId);

      // Reordena na lista local
      setProdutos((anteriores) => {
        const daCat = anteriores
          .filter((p) => p.categoria_id === categoriaId)
          .sort((a, b) => a.posicao - b.posicao);

        const idx = daCat.findIndex((p) => p.id === produtoId);
        if (idx === -1) return anteriores;

        const alvoIdx = direcao === 'subir' ? idx - 1 : idx + 1;
        if (alvoIdx < 0 || alvoIdx >= daCat.length) return anteriores;

        const tempPos = daCat[idx].posicao;
        daCat[idx].posicao = daCat[alvoIdx].posicao;
        daCat[alvoIdx].posicao = tempPos;

        return anteriores.map((p) => {
          const achado = daCat.find((d) => d.id === p.id);
          return achado ? { ...p, posicao: achado.posicao } : p;
        });
      });
    } catch (e) {
      console.error('Erro ao reordenar produtos', e);
    }
  };

  // Ações de Categoria
  const lidarComSalvarCategoria = async (dados: { id?: string; nome: string }) => {
    try {
      const salva = await salvarCategoria(loja.id, dados);
      setCategorias((anteriores) => {
        const existe = anteriores.some((c) => c.id === salva.id);
        if (existe) {
          return anteriores.map((c) => (c.id === salva.id ? salva : c));
        }
        return [...anteriores, salva];
      });
    } catch (e) {
      console.error('Erro ao salvar categoria', e);
    }
  };

  const lidarComExcluirCategoria = async (categoriaId: string) => {
    try {
      await excluirCategoria(loja.id, categoriaId);
      setCategorias((anteriores) => anteriores.filter((c) => c.id !== categoriaId));
      setProdutos((anteriores) =>
        anteriores.map((p) =>
          p.categoria_id === categoriaId ? { ...p, categoria_id: null } : p
        )
      );
    } catch (e) {
      console.error('Erro ao excluir categoria', e);
    }
  };

  // Ações de Grupos de Adicionais
  const lidarComSalvarGrupo = async (dados: {
    id?: string;
    nome: string;
    minimo: number;
    maximo: number;
  }) => {
    try {
      const salvo = await salvarGrupoDeAdicionais(loja.id, dados);
      setGrupos((anteriores) => {
        const existe = anteriores.some((g) => g.id === salvo.id);
        if (existe) {
          return anteriores.map((g) => (g.id === salvo.id ? salvo : g));
        }
        return [...anteriores, salvo];
      });
    } catch (e) {
      console.error('Erro ao salvar grupo', e);
    }
  };

  const lidarComExcluirGrupo = async (grupoId: string) => {
    try {
      await excluirGrupoDeAdicionais(loja.id, grupoId);
      setGrupos((anteriores) => anteriores.filter((g) => g.id !== grupoId));
    } catch (e) {
      console.error('Erro ao excluir grupo', e);
    }
  };

  const lidarComSalvarAdicional = async (
    grupoId: string,
    dados: { id?: string; nome: string; preco_centavos: number; disponivel?: boolean }
  ) => {
    try {
      const salvo = await salvarAdicional(loja.id, grupoId, dados);
      setGrupos((anteriores) =>
        anteriores.map((g) => {
          if (g.id !== grupoId) return g;
          const ads = g.adicionais || [];
          const existe = ads.some((a) => a.id === salvo.id);
          const novosAds = existe
            ? ads.map((a) => (a.id === salvo.id ? salvo : a))
            : [...ads, salvo];
          return { ...g, adicionais: novosAds };
        })
      );
    } catch (e) {
      console.error('Erro ao salvar adicional', e);
    }
  };

  const lidarComExcluirAdicional = async (grupoId: string, adicionalId: string) => {
    try {
      await excluirAdicional(loja.id, grupoId, adicionalId);
      setGrupos((anteriores) =>
        anteriores.map((g) => {
          if (g.id !== grupoId) return g;
          return {
            ...g,
            adicionais: (g.adicionais || []).filter((a) => a.id !== adicionalId),
          };
        })
      );
    } catch (e) {
      console.error('Erro ao excluir adicional', e);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-neutro-texto antialiased pb-24 md:pl-64">
      {/* Navegação Responsiva do Painel */}
      <NavegacaoPainel loja={loja} />

      {/* BARRA SUPERIOR DO PAINEL */}
      <header className="sticky top-0 z-30 border-b border-neutro-borda bg-white shadow-xs">
        <div className="w-full flex items-center justify-between px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <Link
              href={`/painel/pedidos?loja=${loja.link}`}
              className="flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-stone-900 mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Pedidos</span>
            </Link>

            <div
              className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl font-titulo text-base font-bold text-white shadow-xs shrink-0"
              style={{ backgroundColor: loja.cor_principal }}
            >
              {loja.logo_url ? (
                <Image
                  src={loja.logo_url}
                  alt={loja.nome}
                  fill
                  className="object-cover"
                />
              ) : (
                loja.nome.charAt(0)
              )}
            </div>

            <div>
              <h1 className="font-titulo text-base font-bold text-neutro-texto">
                Cardápio · {loja.nome}
              </h1>
              <p className="text-xs text-neutro-secundario">
                Produtos, preços e adicionais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/${loja.link}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 shadow-2xs transition-colors"
            >
              <Store className="h-3.5 w-3.5 text-stone-500" />
              <span>Ver como cliente</span>
              <span className="text-[10px] text-stone-400">↗</span>
            </Link>
          </div>
        </div>

        {/* BARRA DE AÇÕES DO CARDÁPIO */}
        <div className="border-t border-stone-100 bg-stone-50/50 px-4 py-2.5 sm:px-6">
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setProdutoEditando(null);
                  setModalProdutoAberto(true);
                }}
                className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:opacity-95 transition-all active:scale-[0.98]"
                style={{ backgroundColor: loja.cor_principal }}
              >
                <Plus className="h-4 w-4" />
                <span>Novo Produto</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategoriaEditando(null);
                  setModalCategoriaAberto(true);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs"
              >
                <Layers className="h-3.5 w-3.5 text-stone-500" />
                <span>Nova Categoria</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setModalGruposAberto(true)}
              className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs"
            >
              <Sliders className="h-3.5 w-3.5 text-stone-500" />
              <span>Complementos ({grupos.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL: LISTAGEM DE CATEGORIAS E PRODUTOS */}
      <main className="w-full p-4 sm:px-8 lg:px-10 space-y-6">
        {categorias.map((categoria) => {
          const produtosDaCat = produtos
            .filter((p) => p.categoria_id === categoria.id)
            .sort((a, b) => a.posicao - b.posicao);

          return (
            <section
              key={categoria.id}
              className="rounded-2xl border border-neutro-borda bg-white shadow-xs overflow-hidden"
            >
              {/* Cabeçalho da Categoria com controles */}
              <div className="flex items-center justify-between border-b border-stone-200/60 bg-stone-50/70 p-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-titulo text-base font-bold text-neutro-texto">
                    {categoria.nome}
                  </h2>
                  <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-bold text-stone-700">
                    {produtosDaCat.length}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoriaEditando(categoria);
                      setModalCategoriaAberto(true);
                    }}
                    title="Editar nome da categoria"
                    className="rounded p-1.5 text-stone-500 hover:bg-stone-200"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          `Excluir a categoria "${categoria.nome}"? Os produtos continuarão salvos sem categoria.`
                        )
                      ) {
                        lidarComExcluirCategoria(categoria.id);
                      }
                    }}
                    title="Excluir categoria"
                    className="rounded p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Lista dos Produtos da Categoria */}
              <div className="divide-y divide-stone-100">
                {produtosDaCat.map((produto, index) => {
                  const ePrimeiro = index === 0;
                  const eUltimo = index === produtosDaCat.length - 1;

                  return (
                    <div
                      key={produto.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors ${
                        !produto.disponivel ? 'bg-stone-50/70 opacity-60' : 'hover:bg-stone-50/40'
                      }`}
                    >
                      {/* Dados do produto */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {produto.foto_url ? (
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100 shadow-2xs">
                            <Image
                              src={produto.foto_url}
                              alt={produto.nome}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setProdutoEditando(produto);
                              setModalProdutoAberto(true);
                            }}
                            className="group flex flex-col h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50 hover:bg-stone-100/80 hover:border-stone-400 text-stone-400 hover:text-stone-600 transition-colors p-1 text-center"
                            title="Clique para adicionar foto ao produto"
                          >
                            <Camera className="h-4 w-4 mb-0.5 group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] font-bold leading-tight">Add foto</span>
                          </button>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm text-stone-900">
                              {produto.nome}
                            </h3>
                            {!produto.disponivel && (
                              <span className="rounded-md bg-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-700">
                                Pausado
                              </span>
                            )}
                            {produto.controlar_estoque && (
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                  (produto.quantidade_estoque ?? 0) <= 0
                                    ? 'bg-rose-100 text-rose-800'
                                    : (produto.quantidade_estoque ?? 0) <= (produto.estoque_minimo ?? 5)
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {(produto.quantidade_estoque ?? 0) <= 0
                                  ? 'Esgotado'
                                  : `${produto.quantidade_estoque} un em estoque`}
                              </span>
                            )}
                          </div>

                          {produto.descricao && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">
                              {produto.descricao}
                            </p>
                          )}

                          <span className="font-extrabold text-sm text-stone-900 mt-1 block">
                            {formatarPreco(produto.preco_centavos)}
                          </span>
                        </div>
                      </div>

                      {/* Controles de ordenação, interruptor de disponibilidade e edição */}
                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                        {/* Reordenar Subir / Descer */}
                        <div className="flex items-center border border-stone-200 rounded-xl bg-white shadow-2xs">
                          <button
                            type="button"
                            disabled={ePrimeiro}
                            onClick={() =>
                              lidarComReordenarProduto(categoria.id, 'subir', produto.id)
                            }
                            title="Mover produto para cima"
                            className="p-1.5 text-stone-500 disabled:opacity-20 hover:bg-stone-50 rounded-l-xl transition-colors"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={eUltimo}
                            onClick={() =>
                              lidarComReordenarProduto(categoria.id, 'descer', produto.id)
                            }
                            title="Mover produto para baixo"
                            className="p-1.5 text-stone-500 disabled:opacity-20 hover:bg-stone-50 rounded-r-xl transition-colors"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Interruptor tipo Switch Disponível / Pausado */}
                        <button
                          type="button"
                          onClick={() =>
                            lidarComAlternarDisponivel(produto.id, !produto.disponivel)
                          }
                          title={produto.disponivel ? 'Clique para pausar este produto' : 'Clique para ativar no cardápio'}
                          className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                            produto.disponivel
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                              : 'bg-stone-100 text-stone-500 border border-stone-200 hover:bg-stone-200'
                          }`}
                        >
                          <div
                            className={`h-2 w-2 rounded-full transition-colors ${
                              produto.disponivel ? 'bg-emerald-600' : 'bg-stone-400'
                            }`}
                          />
                          <span>{produto.disponivel ? 'Disponível' : 'Pausado'}</span>
                        </button>

                        {/* Editar */}
                        <button
                          type="button"
                          onClick={() => {
                            setProdutoEditando(produto);
                            setModalProdutoAberto(true);
                          }}
                          title="Editar produto"
                          className="rounded-xl border border-stone-200 bg-white p-2 text-stone-600 hover:bg-stone-50 shadow-2xs transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Excluir */}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja excluir "${produto.nome}"?`)) {
                              lidarComExcluirProduto(produto.id);
                            }
                          }}
                          title="Excluir produto"
                          className="rounded-xl border border-stone-200 bg-white p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 shadow-2xs transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {produtosDaCat.length === 0 && (
                  <div className="p-6 text-center text-xs text-stone-400">
                    Nenhum produto nesta categoria.
                  </div>
                )}
              </div>
            </section>
          );
        })}

        {categorias.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
            <UtensilsCrossed className="mx-auto h-8 w-8 text-stone-400 mb-2" />
            <h3 className="font-bold text-sm text-neutro-texto">
              Nenhuma categoria cadastrada
            </h3>
            <p className="text-xs text-neutro-secundario mt-1">
              Crie uma categoria para começar a organizar seu cardápio.
            </p>
            <button
              type="button"
              onClick={() => {
                setCategoriaEditando(null);
                setModalCategoriaAberto(true);
              }}
              className="mt-4 rounded-lg bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800"
            >
              Criar primeira categoria
            </button>
          </div>
        )}
      </main>

      {/* MODAL DE PRODUTO */}
      {modalProdutoAberto && (
        <FormularioProdutoModal
          produtoParaEditar={produtoEditando}
          categorias={categorias}
          gruposDeAdicionais={grupos}
          gruposVinculadosIds={
            produtoEditando
              ? produtoGrupos
                  .filter((pg) => pg.produto_id === produtoEditando.id)
                  .map((pg) => pg.grupo_id)
              : []
          }
          aoSalvar={lidarComSalvarProduto}
          aoFechar={() => {
            setModalProdutoAberto(false);
            setProdutoEditando(null);
          }}
        />
      )}

      {/* MODAL DE CATEGORIA */}
      {modalCategoriaAberto && (
        <FormularioCategoriaModal
          categoriaParaEditar={categoriaEditando}
          aoSalvar={lidarComSalvarCategoria}
          aoFechar={() => {
            setModalCategoriaAberto(false);
            setCategoriaEditando(null);
          }}
        />
      )}

      {/* MODAL DE GESTÃO DE ADICIONAIS */}
      {modalGruposAberto && (
        <GestaoAdicionaisModal
          grupos={grupos}
          aoSalvarGrupo={lidarComSalvarGrupo}
          aoExcluirGrupo={lidarComExcluirGrupo}
          aoSalvarAdicional={lidarComSalvarAdicional}
          aoExcluirAdicional={lidarComExcluirAdicional}
          aoFechar={() => setModalGruposAberto(false)}
        />
      )}
    </div>
  );
}
