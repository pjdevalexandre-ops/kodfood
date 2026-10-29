'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Store, ArrowLeft, Users } from 'lucide-react';
import {
  Loja,
  Categoria,
  Produto,
  GrupoDeAdicionais,
  ProdutoGrupo,
  HorarioFuncionamento,
  Adicional,
} from '@/tipos';
import {
  buscarLojaPeloLink,
  listarCardapioDaLoja,
  obterHorariosDaLoja,
} from '@/acesso-aos-dados';
import { SacolaProvedor, useSacola } from '@/contextos/sacola-contexto';
import { CabecalhoDaLoja } from './cabecalho-da-loja';
import { AvisoLojaFechada } from './aviso-loja-fechada';
import { NavegacaoDeCategorias } from './navegacao-de-categorias';
import { ListaDoCardapio } from './lista-do-cardapio';
import { ModalDoProduto } from './modal-do-produto';
import { BarraDaSacola } from '@/componentes/sacola/barra-da-sacola';
import { obterStatusLoja } from '@/utilitarios/formatadores';

interface ConteudoCardapioProps {
  loja: Loja;
  categorias: Categoria[];
  produtos: Produto[];
  gruposDeAdicionais: GrupoDeAdicionais[];
  produtoGrupos: ProdutoGrupo[];
  horarios: HorarioFuncionamento[];
}

function ConteudoDoCardapio({
  loja,
  categorias,
  produtos,
  gruposDeAdicionais,
  produtoGrupos,
  horarios,
}: ConteudoCardapioProps) {
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const { adicionarItem } = useSacola();
  const statusLoja = obterStatusLoja(loja.aberta, horarios);

  const searchParams = useSearchParams();
  const mesaParam = searchParams.get('mesa');

  useEffect(() => {
    if (mesaParam) {
      try {
        localStorage.setItem(`kodfood_mesa_${loja.link}`, mesaParam);
      } catch {}
    }
  }, [mesaParam, loja.link]);

  // Filtra os grupos de adicionais associados ao produto selecionado
  const gruposDoProdutoSelecionado = produtoSelecionado
    ? gruposDeAdicionais.filter((grupo) =>
        produtoGrupos.some(
          (pg) =>
            pg.produto_id === produtoSelecionado.id && pg.grupo_id === grupo.id
        )
      )
    : [];

  const lidarComAdicionarAoCarrinho = (
    produto: Produto,
    adicionais: Adicional[],
    quantidade: number,
    observacao?: string
  ) => {
    adicionarItem(produto, adicionais, quantidade, observacao);
  };

  const estiloVariavelLoja = {
    '--cor-loja': loja.cor_principal,
  } as React.CSSProperties;

  return (
    <div
      style={estiloVariavelLoja}
      className="mx-auto flex min-h-screen max-w-md flex-col bg-neutro-fundo text-neutro-texto antialiased"
    >
      <CabecalhoDaLoja loja={loja} horarios={horarios} />

      {mesaParam && (
        <div className="mx-4 mt-3 flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50 p-2.5 text-xs text-violet-900 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600 font-bold text-white text-xs">
              {mesaParam}
            </span>
            <span>
              Atendimento no local: <strong>Mesa {mesaParam}</strong>
            </span>
          </div>
          <span className="text-[10px] bg-white px-2 py-0.5 rounded font-bold text-violet-700 border border-violet-200">
            Salão
          </span>
        </div>
      )}

      {!loja.aberta && (
        <AvisoLojaFechada mensagem={statusLoja.mensagem} />
      )}

      {categorias.length > 0 && (
        <NavegacaoDeCategorias
          categorias={categorias}
          corLoja={loja.cor_principal}
        />
      )}

      <main className="flex-1 pb-16">
        <ListaDoCardapio
          categorias={categorias}
          produtos={produtos}
          lojaAberta={loja.aberta}
          corLoja={loja.cor_principal}
          aoSelecionarProduto={(p) => setProdutoSelecionado(p)}
        />
      </main>

      {/* Folha que sobe de baixo ao tocar em um produto */}
      {produtoSelecionado && (
        <ModalDoProduto
          key={produtoSelecionado.id}
          produto={produtoSelecionado}
          gruposDeAdicionais={gruposDoProdutoSelecionado}
          corLoja={loja.cor_principal}
          aoFechar={() => setProdutoSelecionado(null)}
          aoAdicionar={lidarComAdicionarAoCarrinho}
        />
      )}

      {/* Barra de sacola fixa no rodapé */}
      <BarraDaSacola lojaLink={loja.link} corLoja={loja.cor_principal} />
    </div>
  );
}

export interface PaginaDoCardapioClienteProps {
  linkSlug: string;
  lojaInicial?: Loja | null;
  categoriasIniciais?: Categoria[];
  produtosIniciais?: Produto[];
  gruposDeAdicionaisIniciais?: GrupoDeAdicionais[];
  produtoGruposIniciais?: ProdutoGrupo[];
  horariosIniciais?: HorarioFuncionamento[];
}

export function PaginaDoCardapioCliente({
  linkSlug,
  lojaInicial = null,
  categoriasIniciais = [],
  produtosIniciais = [],
  gruposDeAdicionaisIniciais = [],
  produtoGruposIniciais = [],
  horariosIniciais = [],
}: PaginaDoCardapioClienteProps) {
  const [loja, setLoja] = useState<Loja | null>(lojaInicial);
  const [categorias, setCategorias] = useState<Categoria[]>(categoriasIniciais);
  const [produtos, setProdutos] = useState<Produto[]>(produtosIniciais);
  const [gruposDeAdicionais, setGruposDeAdicionais] = useState<GrupoDeAdicionais[]>(gruposDeAdicionaisIniciais);
  const [produtoGrupos, setProdutoGrupos] = useState<ProdutoGrupo[]>(produtoGruposIniciais);
  const [horarios, setHorarios] = useState<HorarioFuncionamento[]>(horariosIniciais);
  const [carregando, setCarregando] = useState(!lojaInicial);
  const [naoEncontrada, setNaoEncontrada] = useState(false);

  // Sincroniza com o armazenamento do navegador (localStorage) para refletir alterações feitas no painel
  useEffect(() => {
    let cancelado = false;

    async function sincronizarComArmazenamento() {
      try {
        const lojaAtual = await buscarLojaPeloLink(linkSlug);
        if (cancelado) return;

        if (lojaAtual) {
          setLoja(lojaAtual);
          const [cardapioAtual, horariosAtuais] = await Promise.all([
            listarCardapioDaLoja(lojaAtual.id),
            obterHorariosDaLoja(lojaAtual.id),
          ]);
          if (cancelado) return;

          if (cardapioAtual) {
            setCategorias(cardapioAtual.categorias);
            setProdutos(cardapioAtual.produtos);
            setGruposDeAdicionais(cardapioAtual.gruposDeAdicionais);
            setProdutoGrupos(cardapioAtual.produtoGrupos);
          }
          if (horariosAtuais) {
            setHorarios(horariosAtuais);
          }
        } else {
          setNaoEncontrada(true);
        }
      } catch (e) {
        console.error('Erro ao sincronizar cardápio com armazenamento', e);
      } finally {
        if (!cancelado) {
          setCarregando(false);
        }
      }
    }

    sincronizarComArmazenamento();

    return () => {
      cancelado = true;
    };
  }, [linkSlug]);

  if (carregando && !loja) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-neutro-fundo p-4 space-y-4 animate-pulse">
        <div className="h-44 w-full rounded-2xl bg-stone-200" />
        <div className="h-10 w-48 rounded-xl bg-stone-200" />
        <div className="h-6 w-full rounded bg-stone-200" />
        <div className="space-y-3 pt-4">
          <div className="h-24 rounded-xl bg-stone-200" />
          <div className="h-24 rounded-xl bg-stone-200" />
          <div className="h-24 rounded-xl bg-stone-200" />
        </div>
      </div>
    );
  }

  if (naoEncontrada || !loja) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-neutro-fundo p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-200 text-stone-600 mb-4">
          <Store className="h-8 w-8" />
        </div>
        <h1 className="font-titulo text-xl font-bold text-stone-900">
          Lanchonete não encontrada
        </h1>
        <p className="mt-2 text-xs text-stone-500 leading-relaxed max-w-xs">
          Não encontramos o estabelecimento no endereço <strong>/{linkSlug}</strong>. Verifique se o link foi digitado corretamente.
        </p>

        <div className="mt-6 flex flex-col gap-2 w-full max-w-xs">
          <Link
            href="/"
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-stone-900 text-xs font-bold text-white hover:bg-stone-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar ao início</span>
          </Link>

          <Link
            href="/cadastrar"
            className="flex h-11 items-center justify-center rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Cadastrar esta lanchonete
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SacolaProvedor lojaLink={loja.link}>
      <ConteudoDoCardapio
        loja={loja}
        categorias={categorias}
        produtos={produtos}
        gruposDeAdicionais={gruposDeAdicionais}
        produtoGrupos={produtoGrupos}
        horarios={horarios}
      />
    </SacolaProvedor>
  );
}
