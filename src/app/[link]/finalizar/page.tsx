import { Metadata } from 'next';
import { buscarLojaPeloLink, listarBairrosAtendidos } from '@/acesso-aos-dados';
import { TelaFinalizarWrapper } from '@/componentes/pedido/formulario-finalizar-pedido';

interface PropriedadesPaginaFinalizar {
  params: {
    link: string;
  };
}

export async function generateMetadata({
  params,
}: PropriedadesPaginaFinalizar): Promise<Metadata> {
  const loja = await buscarLojaPeloLink(params.link);

  if (!loja) {
    return {
      title: 'Finalizar Pedido | KodFood',
    };
  }

  return {
    title: `Finalizar Pedido | ${loja.nome}`,
    description: `Preencha seus dados de entrega e pagamento para concluir seu pedido em ${loja.nome}.`,
  };
}

export default async function PaginaFinalizar({
  params,
}: PropriedadesPaginaFinalizar) {
  const loja = await buscarLojaPeloLink(params.link);
  const bairros = loja ? await listarBairrosAtendidos(loja.id) : [];

  return (
    <TelaFinalizarWrapper
      linkSlug={params.link}
      lojaInicial={loja}
      bairrosIniciais={bairros}
    />
  );
}
