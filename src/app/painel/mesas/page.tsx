import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buscarLojaPeloLink } from '@/acesso-aos-dados';
import { TelaMesasPainel } from '@/componentes/painel/tela-mesas-painel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Mesas & Comandas | Painel KodFood',
  description: 'Controle de salão, mesas abertas, lançamento de comandas e fechamento de conta.',
};

interface PropriedadesPainelMesas {
  searchParams: {
    loja?: string;
  };
}

export default async function PaginaMesasPainel({
  searchParams,
}: PropriedadesPainelMesas) {
  const linkLoja = searchParams.loja || 'lanchonete-do-ze';
  let loja = await buscarLojaPeloLink(linkLoja);

  if (!loja) {
    loja = await buscarLojaPeloLink('lanchonete-do-ze');
  }

  if (!loja) {
    notFound();
  }

  return <TelaMesasPainel lojaInicial={loja} />;
}
