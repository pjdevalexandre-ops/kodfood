import { Metadata } from 'next';
import { buscarLojaPeloLink } from '@/acesso-aos-dados';
import { TelaPedidosPainel } from '@/componentes/painel/tela-pedidos-painel';

export const metadata: Metadata = {
  title: 'Pedidos em Tempo Real | Painel KodFood',
  description: 'Gerenciamento de pedidos em tempo real da lanchonete.',
};

interface PropriedadesPainelPedidos {
  searchParams: {
    loja?: string;
  };
}

export default async function PaginaPedidosPainel({
  searchParams,
}: PropriedadesPainelPedidos) {
  const linkLoja = searchParams.loja || 'lanchonete-do-ze';
  let loja = await buscarLojaPeloLink(linkLoja);

  if (!loja) {
    loja = await buscarLojaPeloLink('lanchonete-do-ze');
  }

  if (!loja) {
    return (
      <div className="p-8 text-center text-xs text-stone-500">
        Nenhuma loja disponível.
      </div>
    );
  }

  return <TelaPedidosPainel lojaInicial={loja} />;
}
