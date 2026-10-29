import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buscarLojaPeloLink } from '@/acesso-aos-dados';
import { TelaCaixaPainel } from '@/componentes/painel/tela-caixa-painel';

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
  const linkLoja = searchParams.loja || 'lanchonete-do-ze';
  let loja = await buscarLojaPeloLink(linkLoja);

  if (!loja) {
    loja = await buscarLojaPeloLink('lanchonete-do-ze');
  }

  if (!loja) {
    notFound();
  }

  return <TelaCaixaPainel lojaInicial={loja} />;
}
