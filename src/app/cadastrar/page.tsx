import { Metadata } from 'next';
import { TelaCadastroLoja } from '@/componentes/cadastro/tela-cadastro-loja';

export const metadata: Metadata = {
  title: 'Criar Cardápio Digital | KodFood',
  description: 'Cadastre sua lanchonete e crie seu cardápio online em minutos para vender direto pelo WhatsApp.',
};

export default function PaginaCadastrar() {
  return <TelaCadastroLoja />;
}
