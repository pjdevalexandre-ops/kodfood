import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buscarLojaPeloLink } from '@/acesso-aos-dados';
import { TelaFinanceiroPainel } from '@/componentes/painel/tela-financeiro-painel';

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
  const linkLoja = searchParams.loja || 'lanchonete-do-ze';
  let loja = await buscarLojaPeloLink(linkLoja);

  if (!loja) {
    loja = await buscarLojaPeloLink('lanchonete-do-ze');
  }

  if (!loja) {
    notFound();
  }

  return <TelaFinanceiroPainel lojaInicial={loja} />;
}
