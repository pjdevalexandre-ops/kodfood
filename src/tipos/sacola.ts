import { Produto, Adicional, GrupoDeAdicionais } from '@/tipos';

export interface ItemSacola {
  idItemSacola: string;
  produto: Produto;
  quantidade: number;
  observacao?: string;
  adicionais: Adicional[];
  precoUnitarioCentavos: number;
  precoTotalCentavos: number;
}

export interface SacolaDaLoja {
  lojaLink: string;
  itens: ItemSacola[];
}
