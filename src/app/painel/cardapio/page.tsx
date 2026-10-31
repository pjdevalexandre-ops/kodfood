import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  buscarLojaPeloLink,
  obterCardapioCompletoParaPainel,
} from '@/acesso-aos-dados';
import { TelaCardapioPainel } from '@/componentes/painel/tela-cardapio-painel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Gestão de Cardápio | Painel KodFood',
  description: 'Adicione, edite e organize categorias, produtos e adicionais.',
};

interface PropriedadesPainelCardapio {
  searchParams: {
    loja?: string;
  };
}

export default async function PaginaCardapioPainel({
  searchParams,
}: PropriedadesPainelCardapio) {
  const linkLoja = searchParams.loja || 'lanchonete-do-ze';
  let loja = await buscarLojaPeloLink(linkLoja);

  if (!loja) {
    loja = await buscarLojaPeloLink('lanchonete-do-ze');
  }

  if (!loja) {
    notFound();
  }

  const dadosCompletos = await obterCardapioCompletoParaPainel(loja.id);

  if (!dadosCompletos) {
    notFound();
  }

  return (
    <TelaCardapioPainel
      lojaInicial={dadosCompletos.loja}
      categoriasIniciais={dadosCompletos.categorias}
      produtosIniciais={dadosCompletos.produtos}
      gruposIniciais={dadosCompletos.gruposDeAdicionais}
      produtoGruposIniciais={dadosCompletos.produtoGrupos}
    />
  );
}
