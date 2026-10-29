import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KodFood | Pedidos para Lanchonetes',
  description: 'Cardápio digital e sistema de pedidos direto com a lanchonete.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-neutro-fundo text-neutro-texto antialiased">
        {children}
      </body>
    </html>
  );
}
