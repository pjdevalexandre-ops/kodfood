import { Metadata } from 'next';
import {
  buscarLojaPeloLink,
  listarCardapioDaLoja,
  obterHorariosDaLoja,
} from '@/acesso-aos-dados';
import { PaginaDoCardapioCliente } from '@/componentes/cardapio/pagina-do-cardapio-cliente';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PropriedadesPaginaLoja {
  params: {
    link: string;
  };
}

export async function generateMetadata({
  params,
}: PropriedadesPaginaLoja): Promise<Metadata> {
  const loja = await buscarLojaPeloLink(params.link);

  if (!loja) {
    return {
      title: 'Cardápio Digital | KodFood',
      description: 'Cardápio digital e sistema de pedidos.',
    };
  }

  const titulo = `${loja.nome} | Cardápio Digital`;
  const descricao =
    loja.descricao ||
    `Confira o cardápio completo de ${loja.nome} e faça seu pedido direto pelo celular.`;

  const imagemPrevia = loja.capa_url || loja.logo_url || '/exemplos/x-burguer.svg';

  return {
    title: titulo,
    description: descricao,
    openGraph: {
      title: titulo,
      description: descricao,
      url: `https://kodfood.app/${loja.link}`,
      siteName: 'KodFood',
      images: [
        {
          url: imagemPrevia,
          width: 800,
          height: 600,
          alt: loja.nome,
        },
      ],
      locale: 'pt_BR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: titulo,
      description: descricao,
      images: [imagemPrevia],
    },
  };
}

export default async function PaginaDaLoja({ params }: PropriedadesPaginaLoja) {
  const loja = await buscarLojaPeloLink(params.link);

  let cardapio = null;
  let horarios: any[] = [];

  if (loja) {
    [cardapio, horarios] = await Promise.all([
      listarCardapioDaLoja(loja.id),
      obterHorariosDaLoja(loja.id),
    ]);
  }

  return (
    <PaginaDoCardapioCliente
      linkSlug={params.link}
      lojaInicial={loja}
      categoriasIniciais={cardapio?.categorias || []}
      produtosIniciais={cardapio?.produtos || []}
      gruposDeAdicionaisIniciais={cardapio?.gruposDeAdicionais || []}
      produtoGruposIniciais={cardapio?.produtoGrupos || []}
      horariosIniciais={horarios}
    />
  );
}
