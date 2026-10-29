import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  buscarLojaPeloLink,
  obterHorariosDaLoja,
} from '@/acesso-aos-dados';
import { TelaLojaPainel } from '@/componentes/painel/tela-loja-painel';

export const metadata: Metadata = {
  title: 'Dados da Loja | Painel KodFood',
  description: 'Gerencie as informações, identidade visual e horários de funcionamento da sua lanchonete.',
};

interface PropriedadesPainelLoja {
  searchParams: {
    loja?: string;
  };
}

export default async function PaginaLojaPainel({
  searchParams,
}: PropriedadesPainelLoja) {
  const linkLoja = searchParams.loja || 'lanchonete-do-ze';
  let loja = await buscarLojaPeloLink(linkLoja);

  if (!loja) {
    loja = await buscarLojaPeloLink('lanchonete-do-ze');
  }

  if (!loja) {
    notFound();
  }

  const horarios = await obterHorariosDaLoja(loja.id);

  return (
    <TelaLojaPainel
      lojaInicial={loja}
      horariosIniciais={horarios}
    />
  );
}
