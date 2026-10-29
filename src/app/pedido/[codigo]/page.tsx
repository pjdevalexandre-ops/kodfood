import { Metadata } from 'next';
import { TelaAcompanhamentoCliente } from '@/componentes/pedido/tela-acompanhamento-cliente';

interface PropriedadesPaginaPedido {
  params: {
    codigo: string;
  };
}

export async function generateMetadata({
  params,
}: PropriedadesPaginaPedido): Promise<Metadata> {
  return {
    title: `Acompanhar Pedido | KodFood`,
    description: `Acompanhe o andamento do seu pedido em tempo real.`,
  };
}

export default function PaginaAcompanharPedido({
  params,
}: PropriedadesPaginaPedido) {
  return (
    <TelaAcompanhamentoCliente codigoAcompanhamento={params.codigo} />
  );
}
