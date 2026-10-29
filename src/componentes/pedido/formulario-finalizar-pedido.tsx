'use client';

import { useState, useEffect, useId } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bike, Store, QrCode, Banknote, CreditCard, AlertCircle, Copy, Check, MessageCircle } from 'lucide-react';
import {
  Loja,
  BairroAtendido,
  TipoAtendimento,
  FormaPagamento,
  DadosCriarPedido,
} from '@/tipos';
import { useSacola, SacolaProvedor } from '@/contextos/sacola-contexto';
import { criarPedido, buscarLojaPeloLink, listarBairrosAtendidos } from '@/acesso-aos-dados';
import {
  formatarPreco,
  aplicarMascaraTelefone,
  converterTextoMoedaParaCentavos,
  formatarMoedaDigitada,
} from '@/utilitarios/formatadores';

interface FormularioFinalizarPedidoProps {
  loja: Loja;
  bairros: BairroAtendido[];
  linkSlug?: string;
}

export function FormularioFinalizarPedido({
  loja: lojaProp,
  bairros: bairrosProp,
  linkSlug,
}: FormularioFinalizarPedidoProps) {
  const router = useRouter();
  const { itens, subtotalCentavos, limparSacola, carregado } = useSacola();

  const [loja, setLoja] = useState<Loja>(lojaProp);
  const [bairros, setBairros] = useState<BairroAtendido[]>(bairrosProp);

  // Estados dos dados do cliente
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');

  // Estados de recebimento
  const tipoInicial: TipoAtendimento = lojaProp.aceita_entrega
    ? 'entrega'
    : 'retirada';
  const [tipo, setTipo] = useState<TipoAtendimento>(tipoInicial);
  const [bairroId, setBairroId] = useState<string>(bairrosProp[0]?.id || '');
  const [rua, setRua] = useState('');
  const [numeroCasa, setNumeroCasa] = useState('');
  const [complemento, setComplemento] = useState('');
  const [referencia, setReferencia] = useState('');

  // Sincroniza com alterações recentes da loja e bairros
  useEffect(() => {
    const slug = linkSlug || lojaProp.link;
    if (!slug) return;
    buscarLojaPeloLink(slug).then(async (l) => {
      if (l) {
        setLoja(l);
        const bs = await listarBairrosAtendidos(l.id);
        setBairros(bs);
        if (bs.length > 0 && !bs.some((b) => b.id === bairroId)) {
          setBairroId(bs[0].id);
        }
      }
    });
  }, [linkSlug, lojaProp.link]);

  // Estados de pagamento
  const [pagamento, setPagamento] = useState<FormaPagamento>('pix');
  const [precisaTroco, setPrecisaTroco] = useState(false);
  const [trocoParaTexto, setTrocoParaTexto] = useState('');

  // Estados de envio e validação
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pixCopiado, setPixCopiado] = useState(false);

  // Bairro selecionado e cálculo da taxa de entrega
  const bairroSelecionado = bairros.find((b) => b.id === bairroId);
  const taxaEntregaCentavos =
    tipo === 'entrega' ? bairroSelecionado?.taxa_centavos || 0 : 0;
  const totalPedidoCentavos = subtotalCentavos + taxaEntregaCentavos;

  // Conversão do troco informado
  const trocoCentavos = converterTextoMoedaParaCentavos(trocoParaTexto);
  const trocoInsuficiente =
    pagamento === 'dinheiro' &&
    precisaTroco &&
    trocoCentavos > 0 &&
    trocoCentavos < totalPedidoCentavos;

  const atingePedidoMinimo = subtotalCentavos >= loja.pedido_minimo_centavos;

  // Validação dos campos
  const validarCampos = (): boolean => {
    const novosErros: Record<string, string> = {};

    if (!nome.trim()) {
      novosErros.nome = 'Informe seu nome para identificação do pedido';
    }

    const numerosTelefone = telefone.replace(/\D/g, '');
    if (!numerosTelefone || numerosTelefone.length < 10) {
      novosErros.telefone = 'Informe um telefone válido com DDD';
    }

    if (tipo === 'entrega') {
      if (!bairroId) {
        novosErros.bairro = 'Selecione o bairro da entrega';
      }
      if (!rua.trim()) {
        novosErros.rua = 'Informe o nome da sua rua ou avenida';
      }
      if (!numeroCasa.trim()) {
        novosErros.numeroCasa = 'Informe o número';
      }
    }

    if (pagamento === 'dinheiro' && precisaTroco) {
      if (trocoCentavos <= 0) {
        novosErros.troco = 'Informe o valor para o qual precisa de troco';
      } else if (trocoCentavos < totalPedidoCentavos) {
        novosErros.troco = `O troco precisa ser maior ou igual a ${formatarPreco(totalPedidoCentavos)}`;
      }
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const lidarComEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroEnvio(null);

    if (!atingePedidoMinimo) {
      setErroEnvio(
        `O pedido não atingiu o valor mínimo de ${formatarPreco(
          loja.pedido_minimo_centavos
        )}.`
      );
      return;
    }

    if (!validarCampos()) {
      return;
    }

    setEnviando(true);

    try {
      const payload: DadosCriarPedido = {
        loja_id: loja.id,
        nome: nome.trim(),
        telefone: telefone.trim(),
        tipo,
        pagamento,
        itens: itens.map((item) => ({
          produto_id: item.produto.id,
          quantidade: item.quantidade,
          observacao: item.observacao,
          adicionais: item.adicionais.map((ad) => ad.id),
        })),
        bairro_id: tipo === 'entrega' ? bairroId : null,
        rua: tipo === 'entrega' ? rua.trim() : null,
        numero_casa: tipo === 'entrega' ? numeroCasa.trim() : null,
        complemento: tipo === 'entrega' ? complemento.trim() || null : null,
        referencia: tipo === 'entrega' ? referencia.trim() || null : null,
        troco_para_centavos:
          pagamento === 'dinheiro' && precisaTroco && trocoCentavos > 0
            ? trocoCentavos
            : null,
      };

      const resultado = await criarPedido(payload);

      // Limpa a sacola e redireciona para a página de acompanhamento
      limparSacola();
      router.push(`/pedido/${resultado.codigo_acompanhamento}`);
    } catch (erro: any) {
      setErroEnvio(
        erro.message ||
          'Não conseguimos enviar o pedido. Verifique os dados e tente novamente.'
      );
      setEnviando(false);
    }
  };

  if (!carregado) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-neutro-fundo p-4">
        <div className="h-10 w-32 animate-pulse rounded bg-stone-200 mb-4" />
        <div className="h-64 w-full animate-pulse rounded-xl bg-white" />
      </div>
    );
  }

  if (itens.length === 0) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6 text-center">
        <h2 className="font-titulo text-lg font-bold text-neutro-texto">
          Sua sacola está vazia
        </h2>
        <p className="mt-2 text-xs text-neutro-secundario">
          Adicione itens ao seu pedido antes de finalizar.
        </p>
        <Link
          href={`/${loja.link}`}
          className="mt-5 rounded-lg px-4 py-2.5 text-xs font-semibold text-white"
          style={{ backgroundColor: loja.cor_principal }}
        >
          Voltar ao cardápio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-neutro-fundo text-neutro-texto antialiased">
      {/* Cabeçalho */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-neutro-borda bg-white px-4">
        <Link
          href={`/${loja.link}/sacola`}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutro-texto hover:text-stone-600"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Sacola</span>
        </Link>
        <h1 className="font-titulo text-sm font-bold text-neutro-texto">
          Finalizar Pedido
        </h1>
        <div className="w-14" />
      </header>

      <form onSubmit={lidarComEnvio} className="flex-1 space-y-4 p-4 pb-36">
        {/* Mensagem geral de erro se houver */}
        {erroEnvio && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-900">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
            <p className="leading-relaxed">{erroEnvio}</p>
          </div>
        )}

        {/* 1. SEUS DADOS */}
        <section className="rounded-xl border border-neutro-borda bg-white p-4 shadow-xs">
          <h2 className="font-titulo text-sm font-bold text-neutro-texto border-b border-stone-100 pb-2 mb-3">
            1. Seus dados
          </h2>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="campo-nome"
                className="block text-xs font-medium text-neutro-texto mb-1"
              >
                Seu nome completo *
              </label>
              <input
                id="campo-nome"
                type="text"
                autoComplete="name"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  if (erros.nome) setErros((prev) => ({ ...prev, nome: '' }));
                }}
                placeholder="Ex.: Lucas Mendes"
                className={`w-full rounded-lg border p-3 text-xs text-neutro-texto placeholder-stone-400 focus:outline-none ${
                  erros.nome
                    ? 'border-red-400 bg-red-50/30 focus:border-red-500'
                    : 'border-neutro-borda focus:border-stone-800'
                }`}
              />
              {erros.nome && (
                <span className="mt-1 block text-[11px] text-red-600">
                  {erros.nome}
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor="campo-telefone"
                className="block text-xs font-medium text-neutro-texto mb-1"
              >
                Celular / WhatsApp *
              </label>
              <input
                id="campo-telefone"
                type="tel"
                autoComplete="tel"
                value={telefone}
                onChange={(e) => {
                  setTelefone(aplicarMascaraTelefone(e.target.value));
                  if (erros.telefone) setErros((prev) => ({ ...prev, telefone: '' }));
                }}
                placeholder="(00) 00000-0000"
                className={`w-full rounded-lg border p-3 text-xs text-neutro-texto placeholder-stone-400 focus:outline-none ${
                  erros.telefone
                    ? 'border-red-400 bg-red-50/30 focus:border-red-500'
                    : 'border-neutro-borda focus:border-stone-800'
                }`}
              />
              {erros.telefone && (
                <span className="mt-1 block text-[11px] text-red-600">
                  {erros.telefone}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* 2. COMO VOCÊ QUER RECEBER */}
        <section className="rounded-xl border border-neutro-borda bg-white p-4 shadow-xs">
          <h2 className="font-titulo text-sm font-bold text-neutro-texto border-b border-stone-100 pb-2 mb-3">
            2. Como você quer receber
          </h2>

          {/* Abas Entrega / Retirada */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {loja.aceita_entrega && (
              <button
                type="button"
                onClick={() => setTipo('entrega')}
                className={`flex h-11 items-center justify-center gap-2 rounded-lg border text-xs font-semibold transition-all ${
                  tipo === 'entrega'
                    ? 'border-stone-800 bg-stone-900 text-white shadow-xs'
                    : 'border-neutro-borda bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Bike className="h-4 w-4" />
                <span>Entrega</span>
              </button>
            )}

            {loja.aceita_retirada && (
              <button
                type="button"
                onClick={() => setTipo('retirada')}
                className={`flex h-11 items-center justify-center gap-2 rounded-lg border text-xs font-semibold transition-all ${
                  tipo === 'retirada'
                    ? 'border-stone-800 bg-stone-900 text-white shadow-xs'
                    : 'border-neutro-borda bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Store className="h-4 w-4" />
                <span>Retirada no balcão</span>
              </button>
            )}
          </div>

          {/* Campos de Entrega */}
          {tipo === 'entrega' ? (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="campo-bairro"
                  className="block text-xs font-medium text-neutro-texto mb-1"
                >
                  Seu bairro *
                </label>
                <select
                  id="campo-bairro"
                  value={bairroId}
                  onChange={(e) => setBairroId(e.target.value)}
                  className="w-full rounded-lg border border-neutro-borda bg-white p-3 text-xs text-neutro-texto focus:border-stone-800 focus:outline-none"
                >
                  {bairros.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nome} — Taxa: {formatarPreco(b.taxa_centavos)}
                      {b.tempo_estimado_min
                        ? ` (~${b.tempo_estimado_min} min)`
                        : ''}
                    </option>
                  ))}
                </select>
                {erros.bairro && (
                  <span className="mt-1 block text-[11px] text-red-600">
                    {erros.bairro}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label
                    htmlFor="campo-rua"
                    className="block text-xs font-medium text-neutro-texto mb-1"
                  >
                    Rua / Avenida *
                  </label>
                  <input
                    id="campo-rua"
                    type="text"
                    value={rua}
                    onChange={(e) => {
                      setRua(e.target.value);
                      if (erros.rua) setErros((prev) => ({ ...prev, rua: '' }));
                    }}
                    placeholder="Nome da sua rua"
                    className={`w-full rounded-lg border p-3 text-xs text-neutro-texto placeholder-stone-400 focus:outline-none ${
                      erros.rua
                        ? 'border-red-400 bg-red-50/30 focus:border-red-500'
                        : 'border-neutro-borda focus:border-stone-800'
                    }`}
                  />
                  {erros.rua && (
                    <span className="mt-1 block text-[11px] text-red-600">
                      {erros.rua}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="campo-numero"
                    className="block text-xs font-medium text-neutro-texto mb-1"
                  >
                    Número *
                  </label>
                  <input
                    id="campo-numero"
                    type="text"
                    value={numeroCasa}
                    onChange={(e) => {
                      setNumeroCasa(e.target.value);
                      if (erros.numeroCasa)
                        setErros((prev) => ({ ...prev, numeroCasa: '' }));
                    }}
                    placeholder="123"
                    className={`w-full rounded-lg border p-3 text-xs text-neutro-texto placeholder-stone-400 focus:outline-none ${
                      erros.numeroCasa
                        ? 'border-red-400 bg-red-50/30 focus:border-red-500'
                        : 'border-neutro-borda focus:border-stone-800'
                    }`}
                  />
                  {erros.numeroCasa && (
                    <span className="mt-1 block text-[11px] text-red-600">
                      {erros.numeroCasa}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="campo-complemento"
                  className="block text-xs font-medium text-neutro-texto mb-1"
                >
                  Complemento (opcional)
                </label>
                <input
                  id="campo-complemento"
                  type="text"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  placeholder="Ex.: Apto 42, Bloco B, Casa dos fundos"
                  className="w-full rounded-lg border border-neutro-borda p-3 text-xs text-neutro-texto placeholder-stone-400 focus:border-stone-800 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="campo-referencia"
                  className="block text-xs font-medium text-neutro-texto mb-1"
                >
                  Ponto de referência (opcional)
                </label>
                <input
                  id="campo-referencia"
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Ex.: Próximo à padaria São Pedro"
                  className="w-full rounded-lg border border-neutro-borda p-3 text-xs text-neutro-texto placeholder-stone-400 focus:border-stone-800 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            /* Detalhe de Retirada */
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3.5 text-xs text-stone-700 leading-relaxed">
              <span className="font-semibold block text-neutro-texto mb-1">
                Endereço para retirada:
              </span>
              <p>{loja.endereco || 'Consulte o endereço com a lanchonete.'}</p>
              <p className="mt-2 text-[11px] text-stone-500">
                Seu pedido será preparado assim que você enviar. Você receberá o código para acompanhar quando estiver pronto para retirada.
              </p>
            </div>
          )}
        </section>

        {/* 3. PAGAMENTO */}
        <section className="rounded-xl border border-neutro-borda bg-white p-4 shadow-xs">
          <h2 className="font-titulo text-sm font-bold text-neutro-texto border-b border-stone-100 pb-2 mb-3">
            3. Pagamento
          </h2>

          <div className="space-y-2">
            {/* Pix */}
            <div
              onClick={() => setPagamento('pix')}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-xs transition-colors ${
                pagamento === 'pix'
                  ? 'border-stone-800 bg-stone-50/80 shadow-xs'
                  : 'border-neutro-borda hover:bg-stone-50/50'
              }`}
            >
              <div className="mt-0.5">
                <QrCode className="h-4 w-4 text-emerald-700" />
              </div>
              <div className="flex-1">
                <span className="font-semibold text-neutro-texto">Pix</span>
                {pagamento === 'pix' && (
                  <>
                    {loja.chave_pix ? (
                      <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 space-y-1.5">
                        <p className="text-[11px] font-semibold text-emerald-800">
                          Chave Pix da loja:
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="flex-1 font-mono text-xs font-bold text-emerald-900 break-all select-all">
                            {loja.chave_pix}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(loja.chave_pix!).then(() => {
                                setPixCopiado(true);
                                setTimeout(() => setPixCopiado(false), 2500);
                              });
                            }}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all shrink-0 ${
                              pixCopiado
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {pixCopiado ? (
                              <>
                                <Check className="h-3 w-3" /> Copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" /> Copiar
                              </>
                            )}
                          </button>
                        </div>
                        {loja.nome_titular_pix && (
                          <p className="text-[10px] text-emerald-700">
                            Titular: <strong>{loja.nome_titular_pix}</strong>
                          </p>
                        )}
                        <p className="text-[10px] text-stone-500">
                          Envie o comprovante pelo WhatsApp após o pagamento.
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 text-[11px] text-stone-600 leading-relaxed">
                        Pague na entrega ou combine o comprovante pelo WhatsApp com a loja.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Dinheiro */}
            <div
              onClick={() => setPagamento('dinheiro')}
              className={`flex cursor-pointer flex-col gap-2 rounded-lg border p-3 text-xs transition-colors ${
                pagamento === 'dinheiro'
                  ? 'border-stone-800 bg-stone-50/80 shadow-xs'
                  : 'border-neutro-borda hover:bg-stone-50/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Banknote className="h-4 w-4 text-emerald-800" />
                <span className="font-semibold text-neutro-texto">Dinheiro</span>
              </div>

              {pagamento === 'dinheiro' && (
                <div className="mt-2 border-t border-stone-200/60 pt-2 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={precisaTroco}
                      onChange={(e) => setPrecisaTroco(e.target.checked)}
                      className="rounded border-stone-300"
                    />
                    <span className="text-xs text-neutro-texto">
                      Precisa de troco?
                    </span>
                  </label>

                  {precisaTroco && (
                    <div className="pt-1">
                      <label
                        htmlFor="campo-troco"
                        className="block text-[11px] font-medium text-stone-600 mb-1"
                      >
                        Troco para quanto?
                      </label>
                      <input
                        id="campo-troco"
                        type="text"
                        inputMode="numeric"
                        value={trocoParaTexto}
                        onChange={(e) => {
                          const centavos = converterTextoMoedaParaCentavos(e.target.value);
                          setTrocoParaTexto(formatarMoedaDigitada(centavos));
                          if (erros.troco) setErros((prev) => ({ ...prev, troco: '' }));
                        }}
                        placeholder="Ex.: 50,00"
                        className={`w-full rounded-lg border p-2.5 text-xs text-neutro-texto focus:outline-none ${
                          erros.troco || trocoInsuficiente
                            ? 'border-red-400 bg-red-50/30'
                            : 'border-neutro-borda focus:border-stone-800'
                        }`}
                      />
                      {trocoInsuficiente && (
                        <span className="mt-1 block text-[11px] text-amber-700">
                          Aviso: o valor informado é menor que o total do pedido ({formatarPreco(totalPedidoCentavos)}).
                        </span>
                      )}
                      {erros.troco && !trocoInsuficiente && (
                        <span className="mt-1 block text-[11px] text-red-600">
                          {erros.troco}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cartão */}
            <div
              onClick={() => setPagamento('cartao_na_entrega')}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-xs transition-colors ${
                pagamento === 'cartao_na_entrega'
                  ? 'border-stone-800 bg-stone-50/80 shadow-xs'
                  : 'border-neutro-borda hover:bg-stone-50/50'
              }`}
            >
              <div className="mt-0.5">
                <CreditCard className="h-4 w-4 text-stone-700" />
              </div>
              <div>
                <span className="font-semibold text-neutro-texto">
                  Cartão na entrega / retirada
                </span>
                <p className="mt-0.5 text-[11px] text-stone-500">
                  Débito ou Crédito. Levamos a maquininha até você.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. RESUMO DOS VALORES */}
        <section className="rounded-xl border border-neutro-borda bg-white p-4 shadow-xs text-xs space-y-2">
          <h2 className="font-titulo text-sm font-bold text-neutro-texto border-b border-stone-100 pb-2 mb-2">
            Resumo dos valores
          </h2>

          <div className="flex justify-between text-neutro-secundario">
            <span>Subtotal ({itens.length} itens)</span>
            <span>{formatarPreco(subtotalCentavos)}</span>
          </div>

          <div className="flex justify-between text-neutro-secundario">
            <span>Taxa de entrega</span>
            <span>
              {tipo === 'entrega'
                ? formatarPreco(taxaEntregaCentavos)
                : 'Grátis (Retirada)'}
            </span>
          </div>

          <div className="border-t border-stone-100 pt-2 flex justify-between font-bold text-sm text-neutro-texto">
            <span>Total a pagar</span>
            <span>{formatarPreco(totalPedidoCentavos)}</span>
          </div>
        </section>
      </form>

      {/* Rodapé fixo com total e botão Enviar Pedido */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-neutro-borda bg-white p-4 shadow-xl">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between mb-2 text-xs">
            <span className="text-neutro-secundario">Total do pedido:</span>
            <span className="font-bold text-base text-neutro-texto">
              {formatarPreco(totalPedidoCentavos)}
            </span>
          </div>

          <button
            type="button"
            onClick={lidarComEnvio}
            disabled={enviando || !atingePedidoMinimo || trocoInsuficiente}
            className="flex h-12 w-full items-center justify-center rounded-xl text-xs font-semibold text-white shadow-sm transition-all disabled:opacity-40 active:scale-[0.99]"
            style={{ backgroundColor: loja.cor_principal }}
          >
            {enviando
              ? 'Enviando pedido...'
              : !atingePedidoMinimo
              ? `Pedido mínimo de ${formatarPreco(loja.pedido_minimo_centavos)}`
              : 'Enviar pedido'}
          </button>
        </div>
      </footer>
    </div>
  );
}

export function TelaFinalizarWrapper({
  linkSlug,
  lojaInicial = null,
  bairrosIniciais = [],
}: {
  linkSlug: string;
  lojaInicial?: Loja | null;
  bairrosIniciais?: BairroAtendido[];
}) {
  const [loja, setLoja] = useState<Loja | null>(lojaInicial);
  const [bairros, setBairros] = useState<BairroAtendido[]>(bairrosIniciais);
  const [carregando, setCarregando] = useState(!lojaInicial);

  useEffect(() => {
    buscarLojaPeloLink(linkSlug).then(async (l) => {
      if (l) {
        setLoja(l);
        const bs = await listarBairrosAtendidos(l.id);
        setBairros(bs);
      }
      setCarregando(false);
    });
  }, [linkSlug]);

  if (carregando && !loja) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-neutro-fundo p-4 space-y-4 animate-pulse">
        <div className="h-10 w-32 rounded bg-stone-200" />
        <div className="h-44 rounded-xl bg-white" />
      </div>
    );
  }

  if (!loja) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-neutro-fundo p-6 text-center">
        <p className="text-sm font-bold text-stone-800">Lanchonete não encontrada</p>
        <Link href="/" className="mt-4 text-xs font-semibold text-stone-600 underline">
          Voltar ao início
        </Link>
      </div>
    );
  }

  return (
    <SacolaProvedor lojaLink={loja.link}>
      <FormularioFinalizarPedido
        loja={loja}
        bairros={bairros}
        linkSlug={linkSlug}
      />
    </SacolaProvedor>
  );
}
