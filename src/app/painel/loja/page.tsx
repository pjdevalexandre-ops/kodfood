import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  obterLojaAtivaParaPainel,
  obterHorariosDaLoja,
} from '@/acesso-aos-dados';
import { TelaLojaPainel } from '@/componentes/painel/tela-loja-painel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  const loja = await obterLojaAtivaParaPainel(searchParams.loja);

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
