interface AvisoLojaFechadaProps {
  mensagem: string;
}

export function AvisoLojaFechada({ mensagem }: AvisoLojaFechadaProps) {
  return (
    <div className="mx-4 my-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 shadow-sm">
      <div className="flex items-start gap-2">
        <span className="font-semibold">Aviso:</span>
        <p className="leading-relaxed">
          {mensagem} Você pode olhar o cardápio, mas os pedidos estão temporariamente pausados.
        </p>
      </div>
    </div>
  );
}
