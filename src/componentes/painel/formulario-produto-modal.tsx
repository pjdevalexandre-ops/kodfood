'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Upload, Trash2, Boxes } from 'lucide-react';
import { Produto, Categoria, GrupoDeAdicionais } from '@/tipos';
import {
  converterTextoMoedaParaCentavos,
  formatarMoedaDigitada,
  formatarPreco,
} from '@/utilitarios/formatadores';
import { redimensionarImagem } from '@/utilitarios/redimensionar-imagem';

interface FormularioProdutoModalProps {
  produtoParaEditar?: Produto | null;
  categorias: Categoria[];
  gruposDeAdicionais: GrupoDeAdicionais[];
  gruposVinculadosIds?: string[];
  aoSalvar: (dados: {
    id?: string;
    categoria_id: string | null;
    nome: string;
    descricao?: string | null;
    preco_centavos: number;
    foto_url?: string | null;
    disponivel?: boolean;
    gruposIds: string[];
    controlar_estoque?: boolean;
    quantidade_estoque?: number;
    estoque_minimo?: number;
  }) => void;
  aoFechar: () => void;
}

export function FormularioProdutoModal({
  produtoParaEditar,
  categorias,
  gruposDeAdicionais,
  gruposVinculadosIds = [],
  aoSalvar,
  aoFechar,
}: FormularioProdutoModalProps) {
  const [nome, setNome] = useState(produtoParaEditar?.nome || '');
  const [descricao, setDescricao] = useState(produtoParaEditar?.descricao || '');
  const [precoTexto, setPrecoTexto] = useState(
    produtoParaEditar
      ? formatarMoedaDigitada(produtoParaEditar.preco_centavos)
      : ''
  );
  const [categoriaId, setCategoriaId] = useState<string>(
    produtoParaEditar?.categoria_id || categorias[0]?.id || ''
  );
  const [fotoUrl, setFotoUrl] = useState<string | null>(
    produtoParaEditar?.foto_url || null
  );
  const [gruposSelecionados, setGruposSelecionados] = useState<string[]>(
    gruposVinculadosIds
  );
  const [controlarEstoque, setControlarEstoque] = useState<boolean>(
    produtoParaEditar?.controlar_estoque ?? false
  );
  const [quantidadeEstoque, setQuantidadeEstoque] = useState<number>(
    produtoParaEditar?.quantidade_estoque ?? 10
  );
  const [estoqueMinimo, setEstoqueMinimo] = useState<number>(
    produtoParaEditar?.estoque_minimo ?? 5
  );
  const [erros, setErros] = useState<Record<string, string>>({});

  const precoCentavos = converterTextoMoedaParaCentavos(precoTexto);

  const lidarComArquivoFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    try {
      // Comprime e redimensiona para 500x500 máx com qualidade ótima
      const imagemOtimizada = await redimensionarImagem(arquivo, 500, 500, 0.85);
      setFotoUrl(imagemOtimizada);
    } catch {
      alert('Erro ao processar imagem. Tente outra foto.');
    }
  };

  const alternarGrupo = (grupoId: string) => {
    setGruposSelecionados((prev) =>
      prev.includes(grupoId)
        ? prev.filter((id) => id !== grupoId)
        : [...prev, grupoId]
    );
  };

  const validarESalvar = (e: React.FormEvent) => {
    e.preventDefault();
    const novosErros: Record<string, string> = {};

    if (!nome.trim()) {
      novosErros.nome = 'Informe o nome do produto';
    }
    if (precoCentavos <= 0) {
      novosErros.preco = 'Informe um preço válido maior que zero';
    }

    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      return;
    }

    aoSalvar({
      id: produtoParaEditar?.id,
      categoria_id: categoriaId || null,
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      preco_centavos: precoCentavos,
      foto_url: fotoUrl,
      disponivel: produtoParaEditar ? produtoParaEditar.disponivel : true,
      gruposIds: gruposSelecionados,
      controlar_estoque: controlarEstoque,
      quantidade_estoque: controlarEstoque ? Math.max(0, Number(quantidadeEstoque) || 0) : undefined,
      estoque_minimo: controlarEstoque ? Math.max(0, Number(estoqueMinimo) || 0) : undefined,
    });

    aoFechar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="fixed inset-0" onClick={aoFechar} />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-neutro-borda p-4">
          <h2 className="font-titulo text-base font-bold text-neutro-texto">
            {produtoParaEditar ? 'Editar Produto' : 'Novo Produto'}
          </h2>
          <button
            onClick={aoFechar}
            className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={validarESalvar} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Nome */}
          <div>
            <label className="block font-semibold text-neutro-texto mb-1">
              Nome do produto *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                if (erros.nome) setErros((p) => ({ ...p, nome: '' }));
              }}
              placeholder="Ex.: X-Burguer Especial"
              className={`w-full rounded-lg border p-2.5 text-xs focus:outline-none ${
                erros.nome
                  ? 'border-red-400 bg-red-50/40'
                  : 'border-neutro-borda focus:border-stone-800'
              }`}
            />
            {erros.nome && (
              <span className="mt-1 block text-[11px] text-red-600">{erros.nome}</span>
            )}
          </div>

          {/* Descrição */}
          <div>
            <label className="block font-semibold text-neutro-texto mb-1">
              Descrição curta (máx. 2 linhas no cardápio)
            </label>
            <textarea
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Pão brioche, hambúrguer 160g, queijo cheddar e maionese da casa."
              className="w-full rounded-lg border border-neutro-borda p-2.5 text-xs focus:border-stone-800 focus:outline-none"
            />
          </div>

          {/* Preço e Categoria */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutro-texto mb-1">
                Preço (R$) *
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={precoTexto}
                onChange={(e) => {
                  const centavos = converterTextoMoedaParaCentavos(e.target.value);
                  setPrecoTexto(formatarMoedaDigitada(centavos));
                  if (erros.preco) setErros((p) => ({ ...p, preco: '' }));
                }}
                placeholder="24,00"
                className={`w-full rounded-lg border p-2.5 text-xs focus:outline-none ${
                  erros.preco
                    ? 'border-red-400 bg-red-50/40'
                    : 'border-neutro-borda focus:border-stone-800'
                }`}
              />
              {erros.preco && (
                <span className="mt-1 block text-[11px] text-red-600">{erros.preco}</span>
              )}
            </div>

            <div>
              <label className="block font-semibold text-neutro-texto mb-1">
                Categoria
              </label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full rounded-lg border border-neutro-borda bg-white p-2.5 text-xs focus:border-stone-800 focus:outline-none"
              >
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Upload de Foto */}
          <div>
            <label className="block font-semibold text-neutro-texto mb-1">
              Foto do produto (opcional)
            </label>
            <div className="flex items-center gap-3">
              {fotoUrl ? (
                <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-stone-200">
                  <Image
                    src={fotoUrl}
                    alt="Prévia do produto"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFotoUrl(null)}
                    title="Remover foto"
                    className="absolute right-0.5 top-0.5 rounded bg-black/70 p-1 text-white hover:bg-black"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 text-[10px] text-stone-400">
                  Sem foto
                </div>
              )}

              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50">
                <Upload className="h-3.5 w-3.5" />
                <span>{fotoUrl ? 'Trocar foto' : 'Enviar foto'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={lidarComArquivoFoto}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Grupos de Adicionais Aplicáveis */}
          {gruposDeAdicionais.length > 0 && (
            <div>
              <label className="block font-semibold text-neutro-texto mb-1">
                Quais adicionais se aplicam a este produto?
              </label>
              <div className="space-y-1.5 rounded-lg border border-neutro-borda p-3 bg-stone-50">
                {gruposDeAdicionais.map((grupo) => {
                  const marcado = gruposSelecionados.includes(grupo.id);
                  return (
                    <label
                      key={grupo.id}
                      className="flex items-center gap-2 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => alternarGrupo(grupo.id)}
                        className="rounded border-stone-300"
                      />
                      <span className="font-medium text-stone-800">
                        {grupo.nome}
                      </span>
                      <span className="text-[11px] text-stone-400">
                        (Mín: {grupo.minimo}, Máx: {grupo.maximo})
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Controle de Estoque */}
          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-900 text-white">
                  <Boxes className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="font-semibold text-stone-900 text-xs">Controle de Estoque</h4>
                  <p className="text-[10px] text-stone-500">Baixa automática em vendas no balcão e online</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={controlarEstoque}
                  onChange={(e) => setControlarEstoque(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {controlarEstoque && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-200/60 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Quantidade Atual
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={quantidadeEstoque}
                    onChange={(e) => setQuantidadeEstoque(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full rounded-lg border border-stone-300 bg-white p-2 text-xs font-semibold focus:outline-none focus:border-stone-900"
                    placeholder="Ex: 24"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Estoque Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={estoqueMinimo}
                    onChange={(e) => setEstoqueMinimo(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full rounded-lg border border-stone-300 bg-white p-2 text-xs font-semibold focus:outline-none focus:border-stone-900"
                    placeholder="Ex: 5"
                  />
                </div>
                <div className="col-span-2 text-[10px] text-stone-500 bg-amber-50 border border-amber-200/60 rounded-md p-2">
                  💡 Ao zerar as unidades, o item é pausado automaticamente no cardápio online para evitar pedidos sem estoque.
                </div>
              </div>
            )}
          </div>

          {/* Botões do Rodapé */}
          <div className="border-t border-neutro-borda pt-3 flex gap-2">
            <button
              type="button"
              onClick={aoFechar}
              className="flex-1 rounded-lg border border-neutro-borda py-2.5 font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-stone-900 py-2.5 font-semibold text-white hover:bg-stone-800"
            >
              {produtoParaEditar ? 'Salvar alterações' : 'Criar produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
