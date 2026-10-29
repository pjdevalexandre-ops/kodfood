'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check, AlertCircle } from 'lucide-react';
import { GrupoDeAdicionais, Adicional } from '@/tipos';
import {
  formatarPreco,
  converterTextoMoedaParaCentavos,
  formatarMoedaDigitada,
} from '@/utilitarios/formatadores';

interface GestaoAdicionaisModalProps {
  grupos: GrupoDeAdicionais[];
  aoSalvarGrupo: (dados: {
    id?: string;
    nome: string;
    minimo: number;
    maximo: number;
  }) => void;
  aoExcluirGrupo: (grupoId: string) => void;
  aoSalvarAdicional: (
    grupoId: string,
    dados: { id?: string; nome: string; preco_centavos: number; disponivel?: boolean }
  ) => void;
  aoExcluirAdicional: (grupoId: string, adicionalId: string) => void;
  aoFechar: () => void;
}

export function GestaoAdicionaisModal({
  grupos,
  aoSalvarGrupo,
  aoExcluirGrupo,
  aoSalvarAdicional,
  aoExcluirAdicional,
  aoFechar,
}: GestaoAdicionaisModalProps) {
  const [grupoEditando, setGrupoEditando] = useState<GrupoDeAdicionais | null>(null);
  const [criandoNovoGrupo, setCriandoNovoGrupo] = useState(false);
  const [nomeGrupo, setNomeGrupo] = useState('');
  const [minimoGrupo, setMinimoGrupo] = useState(0);
  const [maximoGrupo, setMaximoGrupo] = useState(1);

  // Estados para adicionar item a um grupo
  const [grupoSelecionadoParaAdicional, setGrupoSelecionadoParaAdicional] = useState<string | null>(null);
  const [nomeAdicional, setNomeAdicional] = useState('');
  const [precoAdicionalTexto, setPrecoAdicionalTexto] = useState('');

  const iniciarCriacaoGrupo = () => {
    setGrupoEditando(null);
    setNomeGrupo('');
    setMinimoGrupo(0);
    setMaximoGrupo(1);
    setCriandoNovoGrupo(true);
  };

  const iniciarEdicaoGrupo = (g: GrupoDeAdicionais) => {
    setGrupoEditando(g);
    setNomeGrupo(g.nome);
    setMinimoGrupo(g.minimo);
    setMaximoGrupo(g.maximo);
    setCriandoNovoGrupo(true);
  };

  const salvarGrupoForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeGrupo.trim()) return;

    aoSalvarGrupo({
      id: grupoEditando?.id,
      nome: nomeGrupo.trim(),
      minimo: Math.max(0, minimoGrupo),
      maximo: Math.max(minimoGrupo, maximoGrupo),
    });

    setCriandoNovoGrupo(false);
    setGrupoEditando(null);
  };

  const salvarAdicionalForm = (e: React.FormEvent, grupoId: string) => {
    e.preventDefault();
    if (!nomeAdicional.trim()) return;

    const centavos = converterTextoMoedaParaCentavos(precoAdicionalTexto);
    aoSalvarAdicional(grupoId, {
      nome: nomeAdicional.trim(),
      preco_centavos: centavos,
      disponivel: true,
    });

    setNomeAdicional('');
    setPrecoAdicionalTexto('');
    setGrupoSelecionadoParaAdicional(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="fixed inset-0" onClick={aoFechar} />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-neutro-borda p-4">
          <div>
            <h2 className="font-titulo text-base font-bold text-neutro-texto">
              Grupos de Adicionais
            </h2>
            <p className="text-xs text-neutro-secundario">
              Gerencie pontos da carne, molhos, complementos e opções extras.
            </p>
          </div>
          <button
            onClick={aoFechar}
            className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Botão de criar novo grupo */}
          {!criandoNovoGrupo && (
            <button
              type="button"
              onClick={iniciarCriacaoGrupo}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-3 font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Criar novo grupo de adicionais</span>
            </button>
          )}

          {/* Formulário de criar/editar grupo */}
          {criandoNovoGrupo && (
            <form
              onSubmit={salvarGrupoForm}
              className="rounded-xl border border-stone-300 bg-stone-50 p-4 space-y-3"
            >
              <h3 className="font-bold text-sm text-neutro-texto">
                {grupoEditando ? 'Editar grupo' : 'Novo grupo'}
              </h3>

              <div>
                <label className="block font-medium text-neutro-texto mb-1">
                  Nome do grupo (ex.: "Ponto da carne", "Molho extra")
                </label>
                <input
                  type="text"
                  required
                  value={nomeGrupo}
                  onChange={(e) => setNomeGrupo(e.target.value)}
                  placeholder="Nome do grupo"
                  className="w-full rounded-lg border border-neutro-borda bg-white p-2.5 text-xs focus:border-stone-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutro-texto mb-1">
                    Mínimo de escolhas (0 = opcional, 1 = obrigatório)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={minimoGrupo}
                    onChange={(e) => setMinimoGrupo(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-lg border border-neutro-borda bg-white p-2.5 text-xs focus:border-stone-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-neutro-texto mb-1">
                    Máximo de escolhas (1 = escolha única)
                  </label>
                  <input
                    type="number"
                    min={minimoGrupo || 1}
                    max={20}
                    value={maximoGrupo}
                    onChange={(e) => setMaximoGrupo(parseInt(e.target.value, 10) || 1)}
                    className="w-full rounded-lg border border-neutro-borda bg-white p-2.5 text-xs focus:border-stone-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCriandoNovoGrupo(false)}
                  className="flex-1 rounded-lg border border-neutro-borda py-2 font-semibold text-stone-700 hover:bg-stone-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-stone-900 py-2 font-semibold text-white hover:bg-stone-800"
                >
                  Salvar grupo
                </button>
              </div>
            </form>
          )}

          {/* Lista de Grupos Existentes */}
          <div className="space-y-4">
            {grupos.map((grupo) => (
              <div
                key={grupo.id}
                className="rounded-xl border border-neutro-borda bg-white p-4 shadow-xs"
              >
                {/* Linha do Grupo */}
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <div>
                    <h3 className="font-bold text-sm text-neutro-texto">
                      {grupo.nome}
                    </h3>
                    <p className="text-[11px] text-neutro-secundario">
                      {grupo.minimo === 1 && grupo.maximo === 1
                        ? 'Obrigatório · Escolha 1 opção'
                        : grupo.minimo > 0
                        ? `Obrigatório (${grupo.minimo} a ${grupo.maximo} opções)`
                        : `Opcional (até ${grupo.maximo} opções)`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => iniciarEdicaoGrupo(grupo)}
                      className="rounded p-1.5 text-stone-500 hover:bg-stone-100"
                      title="Editar grupo"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Excluir o grupo "${grupo.nome}" e todos os seus adicionais?`)) {
                          aoExcluirGrupo(grupo.id);
                        }
                      }}
                      className="rounded p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50"
                      title="Excluir grupo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Lista de Adicionais do Grupo */}
                <div className="mt-3 space-y-2">
                  {grupo.adicionais && grupo.adicionais.length > 0 ? (
                    grupo.adicionais.map((ad) => (
                      <div
                        key={ad.id}
                        className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-xs border border-stone-200/50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-stone-800">
                            {ad.nome}
                          </span>
                          <span className="text-stone-500">
                            {ad.preco_centavos > 0
                              ? `+ ${formatarPreco(ad.preco_centavos)}`
                              : 'Grátis'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              aoSalvarAdicional(grupo.id, {
                                id: ad.id,
                                nome: ad.nome,
                                preco_centavos: ad.preco_centavos,
                                disponivel: !ad.disponivel,
                              })
                            }
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              ad.disponivel
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-stone-200 text-stone-600'
                            }`}
                          >
                            {ad.disponivel ? 'Ativo' : 'Em falta'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remover o adicional "${ad.nome}"?`)) {
                                aoExcluirAdicional(grupo.id, ad.id);
                              }
                            }}
                            className="text-stone-400 hover:text-red-700"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-stone-400 italic py-1">
                      Nenhum adicional cadastrado neste grupo.
                    </p>
                  )}
                </div>

                {/* Adicionar opção dentro deste grupo */}
                {grupoSelecionadoParaAdicional === grupo.id ? (
                  <form
                    onSubmit={(e) => salvarAdicionalForm(e, grupo.id)}
                    className="mt-3 flex items-center gap-2 pt-2 border-t border-stone-100"
                  >
                    <input
                      type="text"
                      required
                      placeholder="Nome do adicional (ex.: Bacon extra)"
                      value={nomeAdicional}
                      onChange={(e) => setNomeAdicional(e.target.value)}
                      className="flex-1 rounded-lg border border-neutro-borda p-2 text-xs focus:border-stone-800 focus:outline-none"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="R$ 0,00"
                      value={precoAdicionalTexto}
                      onChange={(e) => {
                        const centavos = converterTextoMoedaParaCentavos(e.target.value);
                        setPrecoAdicionalTexto(formatarMoedaDigitada(centavos));
                      }}
                      className="w-24 rounded-lg border border-neutro-borda p-2 text-xs focus:border-stone-800 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-stone-900 px-3 py-2 font-bold text-white text-xs hover:bg-stone-800"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setGrupoSelecionadoParaAdicional(null)}
                      className="rounded-lg border border-neutro-borda p-2 text-stone-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setGrupoSelecionadoParaAdicional(grupo.id);
                      setNomeAdicional('');
                      setPrecoAdicionalTexto('');
                    }}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-stone-900"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Adicionar opção neste grupo</span>
                  </button>
                )}
              </div>
            ))}

            {grupos.length === 0 && (
              <div className="p-8 text-center text-xs text-stone-400">
                Nenhum grupo de adicionais criado ainda.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
