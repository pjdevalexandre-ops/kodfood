import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { obterLojaAtivaParaPainel } from '@/acesso-aos-dados';
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
  const loja = await obterLojaAtivaParaPainel(searchParams.loja);

  if (!loja) {
    notFound();
  }

  return <TelaEstoquePainel lojaInicial={loja} />;
}
