import { SituacaoPedido, TipoAtendimento } from '@/tipos';
import { Check, Clock, X } from 'lucide-react';

interface LinhaDoTempoProps {
  situacao: SituacaoPedido;
  tipo: TipoAtendimento;
  corLoja: string;
}

interface Etapa {
  chave: SituacaoPedido;
  titulo: string;
  descricao: string;
}

export function LinhaDoTempo({ situacao, tipo, corLoja }: LinhaDoTempoProps) {
  if (situacao === 'cancelado') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900">
        <div className="flex items-center gap-2 mb-1">
          <X className="h-4 w-4 text-red-600 shrink-0" />
          <h3 className="font-bold text-sm">Pedido cancelado</h3>
        </div>
        <p className="text-red-700 leading-relaxed">
          Este pedido foi cancelado pela lanchonete. Se tiver dúvidas, toque no botão abaixo para conversar no WhatsApp.
        </p>
      </div>
    );
  }

  // Lista de etapas sequenciais para entrega
  const etapasEntrega: Etapa[] = [
    {
      chave: 'recebido',
      titulo: 'Pedido recebido',
      descricao: 'Aguardando confirmação',
    },
    {
      chave: 'confirmado',
      titulo: 'Confirmado',
      descricao: 'A loja aceitou seu pedido',
    },
    {
      chave: 'em_preparo',
      titulo: 'Estamos preparando',
      descricao: 'Na chapa e sendo embalado',
    },
    {
      chave: 'saiu_para_entrega',
      titulo: 'Saiu para entrega',
      descricao: 'O entregador já está a caminho',
    },
    {
      chave: 'entregue',
      titulo: 'Entregue',
      descricao: 'Bom apetite!',
    },
  ];

  // Lista de etapas sequenciais para retirada
  const etapasRetirada: Etapa[] = [
    {
      chave: 'recebido',
      titulo: 'Pedido recebido',
      descricao: 'Aguardando confirmação',
    },
    {
      chave: 'confirmado',
      titulo: 'Confirmado',
      descricao: 'A loja aceitou seu pedido',
    },
    {
      chave: 'em_preparo',
      titulo: 'Estamos preparando',
      descricao: 'Na chapa e sendo embalado',
    },
    {
      chave: 'pronto_para_retirada',
      titulo: 'Pronto para retirar',
      descricao: 'Pode retirar no balcão',
    },
    {
      chave: 'entregue',
      titulo: 'Pedido retirado',
      descricao: 'Bom apetite!',
    },
  ];

  const etapas = tipo === 'entrega' ? etapasEntrega : etapasRetirada;

  // Encontra o índice da etapa atual
  const indiceAtual = etapas.findIndex((e) => e.chave === situacao);
  const indiceValido = indiceAtual >= 0 ? indiceAtual : 0;

  return (
    <div className="py-2">
      <div className="relative pl-6 space-y-6 before:absolute before:bottom-3 before:left-2.5 before:top-3 before:w-0.5 before:bg-stone-200">
        {etapas.map((etapa, idx) => {
          const concluida = idx < indiceValido;
          const eAtual = idx === indiceValido;
          const futura = idx > indiceValido;

          return (
            <div key={etapa.chave} className="relative">
              {/* Marcador na linha */}
              <div
                className={`absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full text-white transition-all ${
                  concluida
                    ? 'bg-stone-900 shadow-xs'
                    : eAtual
                    ? 'ring-4 ring-black/5 shadow-xs'
                    : 'border-2 border-stone-300 bg-white'
                }`}
                style={eAtual ? { backgroundColor: corLoja } : undefined}
              >
                {concluida && <Check className="h-3 w-3 stroke-[3]" />}
                {eAtual && <Clock className="h-3 w-3 animate-pulse" />}
              </div>

              <div>
                <h4
                  className={`text-xs font-bold leading-none ${
                    futura
                      ? 'text-stone-400'
                      : eAtual
                      ? 'text-neutro-texto'
                      : 'text-stone-700'
                  }`}
                >
                  {etapa.titulo}
                </h4>
                <p
                  className={`mt-1 text-[11px] leading-tight ${
                    futura ? 'text-stone-300' : 'text-neutro-secundario'
                  }`}
                >
                  {etapa.descricao}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
