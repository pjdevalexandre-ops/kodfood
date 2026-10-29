import type { Metadata } from 'next';
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const fonteTitulo = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-titulo',
  display: 'swap',
});

const fonteCorpo = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-corpo',
  display: 'swap',
});

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
    <html lang="pt-BR" className={`${fonteTitulo.variable} ${fonteCorpo.variable}`}>
      <body className="min-h-screen bg-neutro-fundo text-neutro-texto antialiased">
        {children}
      </body>
    </html>
  );
}
