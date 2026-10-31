'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  Store,
  Palette,
  Clock,
  Upload,
  Trash2,
  Check,
  AlertCircle,
  ExternalLink,
  QrCode,
  Lock,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Loja, HorarioFuncionamento } from '@/tipos';
import {
  salvarDadosDaLoja,
  buscarLojaPeloLink,
  obterHorariosDaLoja,
} from '@/acesso-aos-dados';
import {
  converterTextoMoedaParaCentavos,
  formatarMoedaDigitada,
  formatarPreco,
  aplicarMascaraTelefone,
} from '@/utilitarios/formatadores';
import { redimensionarImagem } from '@/utilitarios/redimensionar-imagem';
import { NavegacaoPainel } from './navegacao-painel';

/** Detecta e aplica a máscara correta para chave Pix */
function aplicarMascaraChavePix(valor: string): string {
  const soDigitos = valor.replace(/\D/g, '');

  // E-mail: mantém sem máscara
  if (valor.includes('@')) return valor;

  // CNPJ: 14 dígitos — 00.000.000/0000-00
  if (soDigitos.length > 11) {
    const d = soDigitos.slice(0, 14);
    return d
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  }

  // CPF: 11 dígitos — 000.000.000-00
  if (soDigitos.length === 11) {
    return soDigitos
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  }

  // Celular / telefone: até 11 dígitos — (11) 99999-9999
  if (soDigitos.length >= 1 && soDigitos.length <= 11 && !valor.includes('.')) {
    return aplicarMascaraTelefone(soDigitos);
  }

  return valor;
}

interface TelaLojaPainelProps {
  lojaInicial: Loja;
  horariosIniciais: HorarioFuncionamento[];
}

const PALETA_SUGERIDA = [
  { nome: 'Terracota',     cor: '#B4412B' },
  { nome: 'Verde Escuro',  cor: '#2F6B4F' },
  { nome: 'Vinho',         cor: '#8B1E3F' },
  { nome: 'Mostarda',      cor: '#C27803' },
  { nome: 'Laranja',       cor: '#D95D39' },
  { nome: 'Azul Marinho',  cor: '#1D3557' },
  { nome: 'Carvão',        cor: '#1C1917' },
  { nome: 'Vermelho',      cor: '#9E2A2B' },
];

const NOMES_DIAS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export function TelaLojaPainel({
  lojaInicial,
  horariosIniciais,
}: TelaLojaPainelProps) {
  const [loja, setLoja] = useState<Loja>(lojaInicial);

  // Estados dos campos da loja
  const [nome, setNome] = useState(loja.nome);
  const [descricao, setDescricao] = useState(loja.descricao || '');
  const [telefoneWhatsapp, setTelefoneWhatsapp] = useState(
    loja.telefone_whatsapp ? aplicarMascaraTelefone(loja.telefone_whatsapp) : ''
  );
  const [endereco, setEndereco] = useState(loja.endereco || '');
  const [corPrincipal, setCorPrincipal] = useState(loja.cor_principal);
  const [pedidoMinimoTexto, setPedidoMinimoTexto] = useState(
    formatarMoedaDigitada(loja.pedido_minimo_centavos)
  );
  const [aceitaEntrega, setAceitaEntrega] = useState(loja.aceita_entrega);
  const [aceitaRetirada, setAceitaRetirada] = useState(loja.aceita_retirada);
  const [logoUrl, setLogoUrl] = useState<string | null>(loja.logo_url);
  const [capaUrl, setCapaUrl] = useState<string | null>(loja.capa_url);
  const [chavePix, setChavePix] = useState(loja.chave_pix || '');
  const [nomeTitularPix, setNomeTitularPix] = useState(loja.nome_titular_pix || '');
  const [mercadoPagoToken, setMercadoPagoToken] = useState(loja.mercado_pago_access_token || '');
  const [pixAutomaticoAtivo, setPixAutomaticoAtivo] = useState(!!loja.pix_automatico_ativo);
  const [senhaPainel, setSenhaPainel] = useState(loja.senha_painel || '123456');

  // Horários por dia da semana (0 a 6)
  const [horariosPorDia, setHorariosPorDia] = useState<
    Array<{ dia_semana: number; abre: string; fecha: string; ativo: boolean }>
  >(() => {
    return [0, 1, 2, 3, 4, 5, 6].map((dia) => {
      const existente = horariosIniciais.find((h) => h.dia_semana === dia);
      return {
        dia_semana: dia,
        abre: existente ? existente.abre.substring(0, 5) : '18:00',
        fecha: existente ? existente.fecha.substring(0, 5) : '23:30',
        ativo: !!existente,
      };
    });
  });

  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState(false);

  const searchParams = useSearchParams();
  const slug = searchParams.get('loja') || lojaInicial.link;

  // Sincroniza com alterações salvas no navegador ou nova loja criada
  useEffect(() => {
    if (!slug) return;
    buscarLojaPeloLink(slug).then(async (l) => {
      if (l) {
        setLoja(l);
        setNome(l.nome);
        setDescricao(l.descricao || '');
        setTelefoneWhatsapp(
          l.telefone_whatsapp ? aplicarMascaraTelefone(l.telefone_whatsapp) : ''
        );
        setEndereco(l.endereco || '');
        setCorPrincipal(l.cor_principal);
        setPedidoMinimoTexto(formatarMoedaDigitada(l.pedido_minimo_centavos));
        setAceitaEntrega(l.aceita_entrega);
        setAceitaRetirada(l.aceita_retirada);
        setLogoUrl(l.logo_url);
        setCapaUrl(l.capa_url);
        setChavePix(l.chave_pix || '');
        setNomeTitularPix(l.nome_titular_pix || '');
        setMercadoPagoToken(l.mercado_pago_access_token || '');
        setPixAutomaticoAtivo(!!l.pix_automatico_ativo);

        const hs = await obterHorariosDaLoja(l.id);
        if (hs && hs.length > 0) {
          setHorariosPorDia(
            [0, 1, 2, 3, 4, 5, 6].map((dia) => {
              const existente = hs.find((h) => h.dia_semana === dia);
              return {
                dia_semana: dia,
                abre: existente ? existente.abre.substring(0, 5) : '18:00',
                fecha: existente ? existente.fecha.substring(0, 5) : '23:30',
                ativo: !!existente,
              };
            })
          );
        }
      }
    });
  }, [slug]);

  const lidarComUploadImagem = async (
    e: React.ChangeEvent<HTMLInputElement>,
    tipo: 'logo' | 'capa'
  ) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    try {
      if (tipo === 'logo') {
        const otimizada = await redimensionarImagem(arquivo, 320, 320, 0.88);
        setLogoUrl(otimizada);
      } else {
        const otimizada = await redimensionarImagem(arquivo, 1000, 450, 0.85);
        setCapaUrl(otimizada);
      }
    } catch (erro) {
      console.error('Falha ao processar imagem', erro);
      alert('Não foi possível processar a imagem selecionada.');
    }
  };

  const alternarDiaHorario = (dia: number) => {
    setHorariosPorDia((prev) =>
      prev.map((h) => (h.dia_semana === dia ? { ...h, ativo: !h.ativo } : h))
    );
  };

  const mudarHora = (dia: number, campo: 'abre' | 'fecha', valor: string) => {
    setHorariosPorDia((prev) =>
      prev.map((h) => (h.dia_semana === dia ? { ...h, [campo]: valor } : h))
    );
  };

  const lidarComSalvarTudo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setMensagemSucesso(false);

    const pedidoMinimoCentavos = converterTextoMoedaParaCentavos(pedidoMinimoTexto);

    const horariosFiltrados: HorarioFuncionamento[] = horariosPorDia
      .filter((h) => h.ativo)
      .map((h) => ({
        id: 'h-' + h.dia_semana,
        loja_id: loja.id,
        dia_semana: h.dia_semana,
        abre: h.abre,
        fecha: h.fecha,
      }));

    try {
      const lojaAtualizada = await salvarDadosDaLoja(
        loja.id,
        {
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          telefone_whatsapp: telefoneWhatsapp.replace(/\D/g, '') || null,
          endereco: endereco.trim() || null,
          cor_principal: corPrincipal,
          pedido_minimo_centavos: pedidoMinimoCentavos,
          aceita_entrega: aceitaEntrega,
          aceita_retirada: aceitaRetirada,
          logo_url: logoUrl,
          capa_url: capaUrl,
          chave_pix: chavePix.trim() || null,
          nome_titular_pix: nomeTitularPix.trim() || null,
          mercado_pago_access_token: mercadoPagoToken.trim() || null,
          pix_automatico_ativo: pixAutomaticoAtivo,
          senha_painel: senhaPainel.trim() || null,
        },
        horariosFiltrados
      );

      // Atualiza todos os estados com o valor confirmado pelo servidor
      setLoja(lojaAtualizada);
      setNome(lojaAtualizada.nome);
      setDescricao(lojaAtualizada.descricao || '');
      setLogoUrl(lojaAtualizada.logo_url);
      setCapaUrl(lojaAtualizada.capa_url);
      setCorPrincipal(lojaAtualizada.cor_principal);
      setChavePix(lojaAtualizada.chave_pix || '');
      setNomeTitularPix(lojaAtualizada.nome_titular_pix || '');
      setMercadoPagoToken(lojaAtualizada.mercado_pago_access_token || '');
      setPixAutomaticoAtivo(!!lojaAtualizada.pix_automatico_ativo);

      setMensagemSucesso(true);
      setTimeout(() => setMensagemSucesso(false), 4000);
    } catch (erro) {
      console.error('Falha ao salvar dados da loja', erro);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-neutro-texto antialiased pb-28 md:pb-12 md:pl-64">
      {/* Navegação Responsiva */}
      <NavegacaoPainel loja={loja} />

      {/* CABEÇALHO */}
      <header className="sticky top-0 z-20 border-b border-neutro-borda bg-white shadow-xs py-4">
        <div className="w-full flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold"
              style={{ backgroundColor: corPrincipal }}
            >
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-titulo text-lg font-bold text-neutro-texto">
                Dados e Tema da Loja
              </h1>
              <p className="text-xs text-neutro-secundario">
                {loja.nome} · Nome, cor, horários e identidade visual
              </p>
            </div>
          </div>

          <a
            href={`/${loja.link}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-xs"
          >
            <span>Ver no celular</span>
            <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
          </a>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="w-full p-4 sm:px-8 space-y-6">
        {mensagemSucesso && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 shadow-xs">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>
              Alterações salvas com sucesso! A página do cliente já reflete a nova cor e os dados atualizados.
            </span>
          </div>
        )}

        <form onSubmit={lidarComSalvarTudo} className="space-y-6">
          {/* 1. PRÉVIA AO VIVO DA COR E IDENTIDADE */}
          <section className="rounded-2xl border border-neutro-borda bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-stone-600" />
                <h2 className="font-titulo text-sm font-bold text-neutro-texto">
                  Cor Principal e Prévia ao Vivo
                </h2>
              </div>

              <span className="text-xs font-mono font-bold text-stone-700">
                {corPrincipal.toUpperCase()}
              </span>
            </div>

            {/* Seletor de cores sugeridas e picker */}
            <div>
              <label className="block text-xs font-semibold text-neutro-texto mb-2">
                Escolha uma cor para o tema da sua lanchonete:
              </label>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                {PALETA_SUGERIDA.map((item) => (
                  <button
                    key={item.cor}
                    type="button"
                    onClick={() => setCorPrincipal(item.cor)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                      corPrincipal.toLowerCase() === item.cor.toLowerCase()
                        ? 'border-stone-900 bg-stone-50 ring-2 ring-stone-900/20'
                        : 'border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full shadow-xs"
                      style={{ backgroundColor: item.cor }}
                    />
                    <span>{item.nome}</span>
                  </button>
                ))}

                <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-1 bg-white">
                  <span className="text-xs text-stone-600 font-medium">Outra:</span>
                  <input
                    type="color"
                    value={corPrincipal}
                    onChange={(e) => setCorPrincipal(e.target.value)}
                    className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                </div>
              </div>
            </div>

            {/* BLOCO DE PRÉVIA AO VIVO */}
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                Prévia ao vivo de como os botões e destaques ficam no cardápio:
              </span>

              {/* Cabeçalho simulado */}
              <div className="rounded-xl overflow-hidden border border-stone-200 bg-white">
                <div
                  className="relative h-16 w-full flex items-center px-4 gap-3 text-white font-bold text-sm"
                  style={{ backgroundColor: corPrincipal }}
                >
                  <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-white shadow-xs shrink-0 border border-white/40">
                    {logoUrl ? (
                      <Image src={logoUrl} alt="Logo" fill className="object-cover" />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center font-titulo text-base font-bold text-white"
                        style={{ backgroundColor: corPrincipal }}
                      >
                        {nome.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="font-titulo text-base truncate">{nome || 'Nome da Lanchonete'}</span>
                </div>
                <div className="p-3 flex items-center justify-between text-xs">
                  <span className="text-stone-600">
                    Aberto agora · Mínimo {formatarPreco(converterTextoMoedaParaCentavos(pedidoMinimoTexto))}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                    style={{ backgroundColor: corPrincipal }}
                  >
                    Destaque
                  </span>
                </div>
              </div>

              {/* Botões simulados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div
                  className="flex h-11 items-center justify-between rounded-xl px-4 text-xs font-bold text-white shadow-xs"
                  style={{ backgroundColor: corPrincipal }}
                >
                  <span>Adicionar à sacola</span>
                  <span>R$ 29,50</span>
                </div>

                <div
                  className="flex h-11 items-center justify-between rounded-xl px-4 text-xs font-bold text-white shadow-xs"
                  style={{ backgroundColor: corPrincipal }}
                >
                  <span>Ver sacola · 1 item</span>
                  <span>R$ 29,50</span>
                </div>
              </div>
            </div>
          </section>

          {/* 2. DADOS BÁSICOS DA LOJA */}
          <section className="rounded-2xl border border-neutro-borda bg-white p-5 shadow-xs space-y-4">
            <h2 className="font-titulo text-sm font-bold text-neutro-texto border-b border-stone-100 pb-2">
              Informações Gerais
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-neutro-texto mb-1">
                  Nome da lanchonete *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Lanchonete do Zé"
                  className="w-full rounded-lg border border-neutro-borda p-2.5 text-xs focus:border-stone-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutro-texto mb-1">
                  WhatsApp para contato e pedidos
                </label>
                <input
                  type="tel"
                  value={telefoneWhatsapp}
                  onChange={(e) => setTelefoneWhatsapp(aplicarMascaraTelefone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full rounded-lg border border-neutro-borda p-2.5 text-xs focus:border-stone-800 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-neutro-texto mb-1">
                  Descrição curta
                </label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex.: Hambúrgueres na brasa, porções crocantes e bebidas geladas."
                  className="w-full rounded-lg border border-neutro-borda p-2.5 text-xs focus:border-stone-800 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-neutro-texto mb-1">
                  Endereço completo (visível para retirada e contato)
                </label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Ex.: Rua das Oliveiras, 142 - Centro"
                  className="w-full rounded-lg border border-neutro-borda p-2.5 text-xs focus:border-stone-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutro-texto mb-1">
                  Pedido mínimo (R$)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={pedidoMinimoTexto}
                  onChange={(e) => {
                    const centavos = converterTextoMoedaParaCentavos(e.target.value);
                    setPedidoMinimoTexto(formatarMoedaDigitada(centavos));
                  }}
                  placeholder="20,00"
                  className="w-full rounded-lg border border-neutro-borda p-2.5 text-xs focus:border-stone-800 focus:outline-none"
                />
              </div>
            </div>

            {/* Modalidades aceitas */}
            <div className="border-t border-stone-100 pt-3">
              <label className="block font-semibold text-neutro-texto mb-2 text-xs">
                Modalidades de atendimento:
              </label>
              <div className="flex flex-wrap gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aceitaEntrega}
                    onChange={(e) => setAceitaEntrega(e.target.checked)}
                    className="rounded border-stone-300"
                  />
                  <span className="font-medium text-stone-800">
                    Aceita pedidos para Entrega em domicílio
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aceitaRetirada}
                    onChange={(e) => setAceitaRetirada(e.target.checked)}
                    className="rounded border-stone-300"
                  />
                  <span className="font-medium text-stone-800">
                    Aceita Retirada no balcão
                  </span>
                </label>
              </div>
            </div>
          </section>

          {/* PIX */}
          <section className="rounded-2xl border border-neutro-borda bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
              <QrCode className="h-4 w-4 text-emerald-700" />
              <h2 className="font-titulo text-sm font-bold text-neutro-texto">
                Chave Pix para Recebimento
              </h2>
            </div>
            <p className="text-xs text-stone-500">
              Preencha sua chave Pix para que o cliente veja automaticamente ao escolher o pagamento por Pix no checkout. Ele pode copiar a chave com 1 clique.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-neutro-texto mb-1">
                  Chave Pix (CPF, CNPJ, celular ou e-mail)
                </label>
                <input
                  type="text"
                  value={chavePix}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setChavePix(aplicarMascaraChavePix(raw));
                  }}
                  placeholder="Ex.: 11987654321 ou email@loja.com"
                  className="w-full rounded-lg border border-neutro-borda p-2.5 text-xs focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                />
                <span className="block mt-1 text-[10px] text-stone-400">
                  Celular, CPF e CNPJ recebem formatação automática enquanto você digita.
                </span>
              </div>
              <div>
                <label className="block font-semibold text-neutro-texto mb-1">
                  Nome do titular da conta Pix
                </label>
                <input
                  type="text"
                  value={nomeTitularPix}
                  onChange={(e) => setNomeTitularPix(e.target.value)}
                  placeholder="Ex.: José da Silva"
                  className="w-full rounded-lg border border-neutro-borda p-2.5 text-xs focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                />
              </div>
            </div>
            {chavePix && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                <QrCode className="h-4 w-4 shrink-0" />
                <span>
                  <strong>Chave cadastrada:</strong> O cliente verá &ldquo;{chavePix}&rdquo; no checkout com botão de copiar.
                </span>
              </div>
            )}

            {/* Pix via Mercado Pago — confirmação automática */}
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-sky-700 shrink-0" />
                    <span className="font-bold text-sky-950 text-xs">
                      Confirmação automática via Mercado Pago
                    </span>
                  </div>
                  <p className="text-[11px] text-sky-800 leading-relaxed pl-5">
                    O pedido só entra na cozinha após o banco confirmar o pagamento. Evita trotes e falsos comprovantes.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={pixAutomaticoAtivo}
                    onChange={(e) => setPixAutomaticoAtivo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                </label>
              </div>

              {pixAutomaticoAtivo && (
                <div className="pt-2 border-t border-sky-100 space-y-2">
                  <label className="block font-semibold text-sky-950 text-[11px]">
                    Token de acesso do Mercado Pago
                  </label>
                  <input
                    type="password"
                    value={mercadoPagoToken}
                    onChange={(e) => setMercadoPagoToken(e.target.value)}
                    placeholder="APP_USR-..."
                    className="w-full rounded-lg border border-sky-300 bg-white p-2.5 text-xs text-stone-900 focus:border-sky-600 focus:outline-none"
                  />
                  <p className="text-[10px] text-sky-700">
                    O valor cai direto na sua conta do Mercado Pago assim que o cliente pagar. Obtenha o token em mercadopago.com.br/developers.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ACESSO E SEGURANÇA DO PAINEL */}
          <section className="rounded-2xl border border-neutro-borda bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-stone-700" />
                <h2 className="font-titulo text-sm font-bold text-neutro-texto">
                  Senha de Acesso ao Painel
                </h2>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Loja Protegida</span>
              </div>
            </div>

            <p className="text-xs text-stone-500">
              Defina a senha que você e sua equipe usam para acessar o painel de pedidos e configurações. Para não atrapalhar a correria do atendimento, sua conexão fica salva neste aparelho por 30 dias.
            </p>

            <div className="max-w-xs text-xs space-y-1.5">
              <label className="block font-semibold text-neutro-texto">
                Senha da Loja (mínimo 4 dígitos)
              </label>
              <input
                type="text"
                value={senhaPainel}
                onChange={(e) => setSenhaPainel(e.target.value)}
                placeholder="Ex: 123456"
                className="w-full rounded-lg border border-neutro-borda p-2.5 text-xs font-mono font-bold text-stone-800 focus:border-stone-800 focus:outline-none"
              />
              <span className="block text-[10px] text-stone-400">
                Você pode trocar esta senha quando quiser. Ninguém sem esta senha conseguirá entrar no painel da sua loja.
              </span>
            </div>
          </section>

          {/* 3. LOGO E CAPA */}
          <section className="rounded-2xl border border-neutro-borda bg-white p-5 shadow-xs space-y-4">
            <h2 className="font-titulo text-sm font-bold text-neutro-texto border-b border-stone-100 pb-2">
              Logo e Imagem de Capa
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Logo */}
              <div>
                <label className="block font-semibold text-neutro-texto mb-1">
                  Logo da loja (quadrada)
                </label>
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-stone-200">
                      <Image src={logoUrl} alt="Logo" fill className="object-cover" />
                      <button
                        type="button"
                        onClick={() => setLogoUrl(null)}
                        className="absolute right-0.5 top-0.5 rounded bg-black/70 p-1 text-white hover:bg-black"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-xl font-titulo text-xl font-bold text-white shadow-xs"
                      style={{ backgroundColor: corPrincipal }}
                    >
                      {nome.charAt(0)}
                    </div>
                  )}

                  <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{logoUrl ? 'Trocar logo' : 'Enviar logo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => lidarComUploadImagem(e, 'logo')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Capa */}
              <div>
                <label className="block font-semibold text-neutro-texto mb-1">
                  Capa do cabeçalho
                </label>
                <div className="flex items-center gap-3">
                  {capaUrl ? (
                    <div className="relative h-16 w-28 overflow-hidden rounded-xl border border-stone-200">
                      <Image src={capaUrl} alt="Capa" fill className="object-cover" />
                      <button
                        type="button"
                        onClick={() => setCapaUrl(null)}
                        className="absolute right-0.5 top-0.5 rounded bg-black/70 p-1 text-white hover:bg-black"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="h-16 w-28 rounded-xl shadow-xs"
                      style={{ backgroundColor: corPrincipal }}
                    />
                  )}

                  <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{capaUrl ? 'Trocar capa' : 'Enviar capa'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => lidarComUploadImagem(e, 'capa')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* 4. HORÁRIOS DE FUNCIONAMENTO */}
          <section className="rounded-2xl border border-neutro-borda bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
              <Clock className="h-4 w-4 text-stone-600" />
              <h2 className="font-titulo text-sm font-bold text-neutro-texto">
                Horário de Funcionamento por Dia da Semana
              </h2>
            </div>

            <div className="divide-y divide-stone-100 text-xs">
              {horariosPorDia.map((horario) => (
                <div
                  key={horario.dia_semana}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                >
                  <label className="flex items-center gap-2.5 cursor-pointer w-36 font-semibold">
                    <input
                      type="checkbox"
                      checked={horario.ativo}
                      onChange={() => alternarDiaHorario(horario.dia_semana)}
                      className="rounded border-stone-300"
                    />
                    <span className={horario.ativo ? 'text-neutro-texto' : 'text-stone-400'}>
                      {NOMES_DIAS[horario.dia_semana]}
                    </span>
                  </label>

                  {horario.ativo ? (
                    <div className="flex items-center gap-2">
                      <span className="text-stone-500">Das</span>
                      <input
                        type="time"
                        value={horario.abre}
                        onChange={(e) =>
                          mudarHora(horario.dia_semana, 'abre', e.target.value)
                        }
                        className="rounded-lg border border-stone-200 bg-stone-50 p-1.5 text-xs font-semibold text-stone-800"
                      />
                      <span className="text-stone-500">às</span>
                      <input
                        type="time"
                        value={horario.fecha}
                        onChange={(e) =>
                          mudarHora(horario.dia_semana, 'fecha', e.target.value)
                        }
                        className="rounded-lg border border-stone-200 bg-stone-50 p-1.5 text-xs font-semibold text-stone-800"
                      />
                    </div>
                  ) : (
                    <span className="text-stone-400 italic">Fechado neste dia</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* BOTÃO SALVAR TUDO */}
          <div className="sticky bottom-20 md:bottom-4 z-20">
            <button
              type="submit"
              disabled={salvando}
              className="flex h-12 w-full items-center justify-center rounded-xl text-xs font-bold text-white shadow-xl transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
              style={{ backgroundColor: corPrincipal }}
            >
              {salvando ? 'Salvando alterações...' : 'Salvar configurações da loja'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
