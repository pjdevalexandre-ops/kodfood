import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buscarLojaPeloLink } from '@/acesso-aos-dados';
import { TelaEstoquePainel } from '@/componentes/painel/tela-estoque-painel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Controle de Estoque | Painel KodFood',
  description: 'Controle de estoque, alerta de reposição e baixa automática de produtos.',
};

interface PropriedadesPainelEstoque {
  searchParams: {
    loja?: string;
  };
}

export default async function PaginaEstoquePainel({
  searchParams,
}: PropriedadesPainelEstoque) {
  const linkLoja = searchParams.loja || 'lanchonete-do-ze';
  let loja = await buscarLojaPeloLink(linkLoja);

  if (!loja) {
    loja = await buscarLojaPeloLink('lanchonete-do-ze');
  }

  if (!loja) {
    notFound();
  }

  return <TelaEstoquePainel lojaInicial={loja} />;
}
