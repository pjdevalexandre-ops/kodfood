import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { obterLojaAtivaParaPainel } from '@/acesso-aos-dados';
import { TelaCaixaPainel } from '@/componentes/painel/tela-caixa-painel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Caixa do Dia | Painel KodFood',
  description: 'Abertura, conferência de sangrias, suprimentos e fechamento de caixa.',
};

interface PropriedadesPainelCaixa {
  searchParams: {
    loja?: string;
  };
}

export default async function PaginaCaixaPainel({
  searchParams,
}: PropriedadesPainelCaixa) {
  const loja = await obterLojaAtivaParaPainel(searchParams.loja);

  if (!loja) {
    notFound();
  }

  return <TelaCaixaPainel lojaInicial={loja} />;
}
