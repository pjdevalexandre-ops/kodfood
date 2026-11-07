import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { obterLojaAtivaParaPainel } from '@/acesso-aos-dados';
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
  const loja = await obterLojaAtivaParaPainel(searchParams.loja);

  if (!loja) {
    notFound();
  }

  return <TelaMesasPainel lojaInicial={loja} />;
}
