import { Metadata } from 'next';
import { buscarLojaPeloLink } from '@/acesso-aos-dados';
import { PaginaDaSacolaCliente } from '@/componentes/sacola/pagina-da-sacola-cliente';

interface PropriedadesPaginaSacola {
  params: {
    link: string;
  };
}

export async function generateMetadata({
  params,
}: PropriedadesPaginaSacola): Promise<Metadata> {
  const loja = await buscarLojaPeloLink(params.link);

  if (!loja) {
    return {
      title: 'Sacola | KodFood',
    };
  }

  return {
    title: `Sua Sacola | ${loja.nome}`,
    description: `Revise os itens da sua sacola em ${loja.nome}.`,
  };
}

export default async function PaginaSacola({ params }: PropriedadesPaginaSacola) {
  const loja = await buscarLojaPeloLink(params.link);

  return <PaginaDaSacolaCliente linkSlug={params.link} loja={loja} />;
}
