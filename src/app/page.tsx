import Link from 'next/link';
import {
  UtensilsCrossed,
  Smartphone,
  Users,
  Boxes,
  Banknote,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function PaginaInicial() {
  return (
    <div className="min-h-screen bg-stone-50 text-neutro-texto antialiased flex flex-col justify-between">
      {/* 1. CABEÇALHO / NAVBAR */}
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-white shadow-xs">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div>
              <span className="font-titulo text-lg font-bold tracking-tight text-stone-900">
                KodFood
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Plataforma para Restaurantes
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/painel/entrar"
              className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors"
            >
              <Lock className="h-3.5 w-3.5 text-stone-500" />
              <span>Entrar no Painel</span>
            </Link>

            <Link
              href="/cadastrar"
              className="flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-stone-800 transition-colors"
            >
              <span>Cadastrar Restaurante</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 pt-12 pb-16 sm:px-6 sm:pt-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 shadow-xs mb-6">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Cardápio Online Próprio · Zero comissões abusivas por pedido</span>
          </div>

          <h1 className="font-titulo text-3xl font-extrabold tracking-tight text-stone-900 sm:text-5xl max-w-3xl mx-auto leading-tight sm:leading-tight">
            O Sistema Completo para a Gestão e Vendas do seu Restaurante
          </h1>

          <p className="mt-4 text-sm sm:text-base text-stone-600 max-w-2xl mx-auto leading-relaxed">
            Receba pedidos pelo WhatsApp, controle mesas e comandas no salão, dê baixa automática no estoque e feche o caixa do dia em um só lugar.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <Link
              href="/cadastrar"
              className="w-full sm:w-auto flex h-12 items-center justify-center gap-2 rounded-xl bg-stone-900 px-6 text-sm font-bold text-white shadow-md hover:bg-stone-800 active:scale-[0.99] transition-all"
            >
              <span>Criar Cardápio Digital</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/painel/entrar"
              className="w-full sm:w-auto flex h-12 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-6 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-xs"
            >
              <span>Já sou cadastrado (Login)</span>
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-stone-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Cardápio 100% responsivo
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Cupom térmico 80mm
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Chave Pix com 1 clique
            </span>
          </div>
        </section>

        {/* 3. RECURSOS / PILARES */}
        <section className="border-t border-stone-200/80 bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center max-w-xl mx-auto mb-12">
              <h2 className="font-titulo text-2xl font-bold text-stone-900">
                Tudo o que sua lanchonete precisa em uma única tela
              </h2>
              <p className="mt-2 text-xs text-stone-600">
                Projetado para ser rápido na cozinha, simples para o atendente e intuitivo para o cliente.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1 */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-6 space-y-3 hover:border-stone-400 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-700 font-bold">
                  <Smartphone className="h-5 w-5" />
                </div>
                <h3 className="font-titulo text-base font-bold text-stone-900">
                  Cardápio Digital & WhatsApp
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Link próprio para a sua bio do Instagram. O cliente escolhe adicionais, copia sua chave Pix e envia o pedido diagramado direto no WhatsApp.
                </p>
              </div>

              {/* Card 2 */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-6 space-y-3 hover:border-stone-400 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 font-bold">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="font-titulo text-base font-bold text-stone-900">
                  Mesas & Comandas (PDV)
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Mapa de mesas visual em tempo real. Lançamento rápido de pedidos no balcão, cálculo de 10% do garçom e divisão de conta por pessoas.
                </p>
              </div>

              {/* Card 3 */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-6 space-y-3 hover:border-stone-400 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold">
                  <Boxes className="h-5 w-5" />
                </div>
                <h3 className="font-titulo text-base font-bold text-stone-900">
                  Estoque com Baixa Automática
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Vendeu, baixou. Ao zerar o estoque de um produto, ele é pausado automaticamente no cardápio online para evitar vender o que não tem.
                </p>
              </div>

              {/* Card 4 */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-6 space-y-3 hover:border-stone-400 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="font-titulo text-base font-bold text-stone-900">
                  Caixa Diário & Financeiro
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Abertura de caixa com fundo de troco, controle de sangrias e suprimentos, conferência física de gaveta e comprovante de fechamento em 80mm.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 4. RODAPÉ */}
      <footer className="border-t border-stone-200 bg-stone-100/80 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span className="font-titulo font-bold text-stone-900">KodFood</span>
            <span>· Sistema de Pedidos e Gestão</span>
          </div>
          <div className="flex items-center gap-4 font-medium">
            <Link href="/painel/entrar" className="hover:text-stone-900">
              Acesso do Estabelecimento
            </Link>
            <Link href="/cadastrar" className="hover:text-stone-900">
              Cadastre sua Loja
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
