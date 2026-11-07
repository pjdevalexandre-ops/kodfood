import { Metadata } from 'next';
import { obterLojaAtivaParaPainel } from '@/acesso-aos-dados';
import { TelaPedidosPainel } from '@/componentes/painel/tela-pedidos-painel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  const loja = await obterLojaAtivaParaPainel(searchParams.loja);

  if (!loja) {
    return (
      <div className="p-8 text-center text-xs text-stone-500">
        Nenhuma loja disponível.
      </div>
    );
  }

  return <TelaPedidosPainel lojaInicial={loja} />;
}
