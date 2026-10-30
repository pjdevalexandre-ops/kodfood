import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KodFood | Pedidos para Lanchonetes',
  description: 'Cardápio digital e sistema de pedidos direto com a lanchonete.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full min-h-screen bg-neutro-fundo text-neutro-texto antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
