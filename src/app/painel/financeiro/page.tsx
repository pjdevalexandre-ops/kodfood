import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { obterLojaAtivaParaPainel } from '@/acesso-aos-dados';
import { TelaFinanceiroPainel } from '@/componentes/painel/tela-financeiro-painel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Financeiro & Vendas | Painel KodFood',
  description: 'Relatório de faturamento, ticket médio, formas de pagamento e produtos mais vendidos.',
};

interface PropriedadesPainelFinanceiro {
  searchParams: {
    loja?: string;
  };
}

export default async function PaginaFinanceiroPainel({
  searchParams,
}: PropriedadesPainelFinanceiro) {
  const loja = await obterLojaAtivaParaPainel(searchParams.loja);

  if (!loja) {
    notFound();
  }

  return <TelaFinanceiroPainel lojaInicial={loja} />;
}
