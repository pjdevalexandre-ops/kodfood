'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Bike,
  Plus,
  Edit2,
  Trash2,
  Clock,
  DollarSign,
  X,
  Store,
} from 'lucide-react';
import { Loja, BairroAtendido } from '@/tipos';
import {
  salvarBairro,
  excluirBairro,
  alternarStatusBairro,
  buscarLojaPeloLink,
  listarBairrosAtendidos,
} from '@/acesso-aos-dados';
import {
  formatarPreco,
  converterTextoMoedaParaCentavos,
  formatarMoedaDigitada,
} from '@/utilitarios/formatadores';
import { NavegacaoPainel } from './navegacao-painel';

interface TelaEntregaPainelProps {
  loja: Loja;
  bairrosIniciais: BairroAtendido[];
}

export function TelaEntregaPainel({
  loja: lojaInicial,
  bairrosIniciais,
}: TelaEntregaPainelProps) {
  const [loja, setLoja] = useState<Loja>(lojaInicial);
  const [bairros, setBairros] = useState<BairroAtendido[]>(bairrosIniciais);
  const [modalAberto, setModalAberto] = useState(false);
  const [bairroEditando, setBairroEditando] = useState<BairroAtendido | null>(null);

  const searchParams = useSearchParams();
  const slug = searchParams.get('loja') || lojaInicial.link;

  useEffect(() => {
    if (!slug) return;
    buscarLojaPeloLink(slug).then(async (l) => {
      if (l) {
        setLoja(l);
        const bs = await listarBairrosAtendidos(l.id);
        setBairros(bs);
      }
    });
  }, [slug]);

  // Estados do formulário
  const [nome, setNome] = useState('');
  const [taxaTexto, setTaxaTexto] = useState('');
  const [tempoEstimado, setTempoEstimado] = useState('');
  const [erro, setErro] = useState('');

  const abrirNovoBairro = () => {
    setBairroEditando(null);
    setNome('');
    setTaxaTexto('');
    setTempoEstimado('');
    setErro('');
    setModalAberto(true);
  };

  const abrirEdicaoBairro = (b: BairroAtendido) => {
    setBairroEditando(b);
    setNome(b.nome);
    setTaxaTexto(formatarMoedaDigitada(b.taxa_centavos));
    setTempoEstimado(b.tempo_estimado_min ? String(b.tempo_estimado_min) : '');
    setErro('');
    setModalAberto(true);
  };

  const lidarComSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('Informe o nome do bairro');
      return;
    }

    const taxaCentavos = converterTextoMoedaParaCentavos(taxaTexto);
    const tempoMin = tempoEstimado ? parseInt(tempoEstimado, 10) : null;

    try {
      const salvo = await salvarBairro(loja.id, {
        id: bairroEditando?.id,
        nome: nome.trim(),
        taxa_centavos: taxaCentavos,
        tempo_estimado_min: tempoMin,
        ativo: bairroEditando ? bairroEditando.ativo : true,
      });

      setBairros((anteriores) => {
        const existe = anteriores.some((b) => b.id === salvo.id);
        if (existe) {
          return anteriores.map((b) => (b.id === salvo.id ? salvo : b));
        }
        return [...anteriores, salvo];
      });

      setModalAberto(false);
    } catch (e) {
      console.error('Erro ao salvar bairro', e);
    }
  };

  const lidarComAlternarAtivo = async (bairroId: string, novoStatus: boolean) => {
    try {
      await alternarStatusBairro(loja.id, bairroId, novoStatus);
      setBairros((anteriores) =>
        anteriores.map((b) =>
          b.id === bairroId ? { ...b, ativo: novoStatus } : b
        )
      );
    } catch (e) {
      console.error('Erro ao alternar status do bairro', e);
    }
  };

  const lidarComExcluir = async (bairroId: string) => {
    try {
      await excluirBairro(loja.id, bairroId);
      setBairros((anteriores) => anteriores.filter((b) => b.id !== bairroId));
    } catch (e) {
      console.error('Erro ao excluir bairro', e);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-neutro-texto antialiased pb-24 md:pb-12 md:pl-64">
      {/* Navegação Responsiva */}
      <NavegacaoPainel loja={loja} />

      {/* CABEÇALHO */}
      <header className="sticky top-0 z-20 border-b border-neutro-borda bg-white shadow-xs py-4">
        <div className="w-full flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold"
              style={{ backgroundColor: loja.cor_principal }}
            >
              <Bike className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-titulo text-lg font-bold text-neutro-texto">
                Bairros e Taxas de Entrega
              </h1>
              <p className="text-xs text-neutro-secundario">
                {loja.nome} · Configure os locais atendidos pelo seu delivery
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={abrirNovoBairro}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity"
            style={{ backgroundColor: loja.cor_principal }}
          >
            <Plus className="h-4 w-4" />
            <span>Adicionar Bairro</span>
          </button>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="w-full p-4 sm:px-8 space-y-4">
        {/* Cartão de Aviso sobre Entregas */}
        {!loja.aceita_entrega && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 leading-relaxed">
            <strong>Aviso:</strong> A opção de entrega está desativada nas configurações da sua loja. Os clientes só conseguem fazer pedidos para retirada até que a entrega seja reativada na aba <strong>Loja</strong>.
          </div>
        )}

        {/* Lista de Bairros */}
        <div className="rounded-2xl border border-neutro-borda bg-white shadow-xs overflow-hidden">
          <div className="divide-y divide-stone-100">
            {bairros.map((bairro) => (
              <div
                key={bairro.id}
                className={`flex items-center justify-between p-4 transition-colors ${
                  !bairro.ativo ? 'bg-stone-50/60 opacity-60' : 'hover:bg-stone-50/40'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-neutro-texto">
                      {bairro.nome}
                    </h3>
                    {!bairro.ativo && (
                      <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-bold text-stone-600">
                        Inativo
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-xs text-neutro-secundario">
                    <span className="font-semibold text-stone-800">
                      Taxa: {formatarPreco(bairro.taxa_centavos)}
                    </span>
                    {bairro.tempo_estimado_min && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-stone-400" />
                          <span>~{bairro.tempo_estimado_min} minutos</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Interruptor Ativar/Desativar */}
                  <button
                    type="button"
                    onClick={() => lidarComAlternarAtivo(bairro.id, !bairro.ativo)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                      bairro.ativo
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                    }`}
                  >
                    {bairro.ativo ? 'Ativo' : 'Desativado'}
                  </button>

                  {/* Editar */}
                  <button
                    type="button"
                    onClick={() => abrirEdicaoBairro(bairro)}
                    className="rounded-lg border border-stone-200 bg-white p-2 text-stone-600 hover:bg-stone-50"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>

                  {/* Excluir */}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Deseja remover o bairro "${bairro.nome}" da lista?`)) {
                        lidarComExcluir(bairro.id);
                      }
                    }}
                    className="rounded-lg border border-stone-200 bg-white p-2 text-stone-400 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {bairros.length === 0 && (
              <div className="p-8 text-center text-xs text-stone-400">
                Nenhum bairro cadastrado. Clique no botão acima para adicionar.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL CRIAR/EDITAR BAIRRO */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="fixed inset-0" onClick={() => setModalAberto(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutro-borda">
              <h2 className="font-titulo text-base font-bold text-neutro-texto">
                {bairroEditando ? 'Editar Bairro' : 'Novo Bairro'}
              </h2>
              <button
                onClick={() => setModalAberto(false)}
                className="rounded-full p-1 text-stone-500 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={lidarComSalvar} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-neutro-texto mb-1">
                  Nome do bairro *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value);
                    if (erro) setErro('');
                  }}
                  placeholder="Ex.: Centro, Jardim das Américas..."
                  className={`w-full rounded-lg border p-2.5 text-xs focus:outline-none ${
                    erro
                      ? 'border-red-400 bg-red-50/40'
                      : 'border-neutro-borda focus:border-stone-800'
                  }`}
                />
                {erro && <span className="mt-1 block text-[11px] text-red-600">{erro}</span>}
              </div>

              <div>
                <label className="block font-semibold text-neutro-texto mb-1">
                  Taxa de entrega (R$) (digite 0 para grátis)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={taxaTexto}
                  onChange={(e) => {
                    const centavos = converterTextoMoedaParaCentavos(e.target.value);
                    setTaxaTexto(formatarMoedaDigitada(centavos));
                  }}
                  placeholder="Ex.: 6,00"
                  className="w-full rounded-lg border border-neutro-borda p-2.5 text-xs focus:border-stone-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutro-texto mb-1">
                  Tempo estimado (minutos) (opcional)
                </label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={tempoEstimado}
                  onChange={(e) => setTempoEstimado(e.target.value)}
                  placeholder="Ex.: 35"
                  className="w-full rounded-lg border border-neutro-borda p-2.5 text-xs focus:border-stone-800 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="flex-1 rounded-lg border border-neutro-borda py-2.5 font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-stone-900 py-2.5 font-semibold text-white hover:bg-stone-800"
                >
                  {bairroEditando ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
