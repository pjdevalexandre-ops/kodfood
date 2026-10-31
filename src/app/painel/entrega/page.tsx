import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  buscarLojaPeloLink,
  obterCardapioCompletoParaPainel,
} from '@/acesso-aos-dados';
import { TelaEntregaPainel } from '@/componentes/painel/tela-entrega-painel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Bairros e Entrega | Painel KodFood',
  description: 'Gerencie os bairros atendidos e taxas de entrega da sua lanchonete.',
};

interface PropriedadesPainelEntrega {
  searchParams: {
    loja?: string;
  };
}

export default async function PaginaEntregaPainel({
  searchParams,
}: PropriedadesPainelEntrega) {
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
    <TelaEntregaPainel
      loja={dadosCompletos.loja}
      bairrosIniciais={dadosCompletos.bairros}
    />
  );
}
