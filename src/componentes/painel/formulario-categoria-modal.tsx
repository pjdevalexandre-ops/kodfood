'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Categoria } from '@/tipos';

interface FormularioCategoriaModalProps {
  categoriaParaEditar?: Categoria | null;
  aoSalvar: (dados: { id?: string; nome: string }) => void;
  aoFechar: () => void;
}

export function FormularioCategoriaModal({
  categoriaParaEditar,
  aoSalvar,
  aoFechar,
}: FormularioCategoriaModalProps) {
  const [nome, setNome] = useState(categoriaParaEditar?.nome || '');
  const [erro, setErro] = useState('');

  const lidarComEnvio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('Informe o nome da categoria');
      return;
    }

    aoSalvar({
      id: categoriaParaEditar?.id,
      nome: nome.trim(),
    });

    aoFechar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="fixed inset-0" onClick={aoFechar} />

      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-neutro-borda">
          <h2 className="font-titulo text-base font-bold text-neutro-texto">
            {categoriaParaEditar ? 'Editar Categoria' : 'Nova Categoria'}
          </h2>
          <button
            onClick={aoFechar}
            className="rounded-full p-1 text-stone-500 hover:bg-stone-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={lidarComEnvio} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-neutro-texto mb-1">
              Nome da categoria *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                if (erro) setErro('');
              }}
              placeholder="Ex.: Hambúrgueres Especiais, Bebidas..."
              className={`w-full rounded-lg border p-2.5 text-xs focus:outline-none ${
                erro
                  ? 'border-red-400 bg-red-50/40'
                  : 'border-neutro-borda focus:border-stone-800'
              }`}
            />
            {erro && <span className="mt-1 block text-[11px] text-red-600">{erro}</span>}
          </div>

          <div className="pt-2 flex gap-2">
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
              {categoriaParaEditar ? 'Salvar' : 'Criar categoria'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
