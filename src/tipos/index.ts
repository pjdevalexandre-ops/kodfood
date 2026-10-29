export type TipoAtendimento = 'entrega' | 'retirada' | 'mesa' | 'balcao';

export type FormaPagamento = 'pix' | 'dinheiro' | 'cartao_na_entrega' | 'cartao';

export type SituacaoPedido =
  | 'recebido'
  | 'confirmado'
  | 'em_preparo'
  | 'pronto_para_retirada'
  | 'saiu_para_entrega'
  | 'entregue'
  | 'cancelado';

export type PapelNaEquipe = 'dono' | 'atendente' | 'entregador';

export interface Loja {
  id: string;
  link: string;
  nome: string;
  descricao: string | null;
  telefone_whatsapp: string | null;
  logo_url: string | null;
  capa_url: string | null;
  cor_principal: string;
  endereco: string | null;
  aberta: boolean;
  ativa: boolean;
  aceita_entrega: boolean;
  aceita_retirada: boolean;
  pedido_minimo_centavos: number;
  ultimo_numero_pedido: number;
  criada_em: string;
  chave_pix: string | null;
  nome_titular_pix: string | null;
}

export interface Equipe {
  id: string;
  loja_id: string;
  usuario_id: string;
  nome: string;
  papel: PapelNaEquipe;
}

export interface HorarioFuncionamento {
  id: string;
  loja_id: string;
  dia_semana: number; // 0 = domingo, 1 = segunda, etc.
  abre: string;       // "18:00"
  fecha: string;      // "23:30"
}

export interface Categoria {
  id: string;
  loja_id: string;
  nome: string;
  posicao: number;
  ativa: boolean;
}

export interface Produto {
  id: string;
  loja_id: string;
  categoria_id: string | null;
  nome: string;
  descricao: string | null;
  preco_centavos: number;
  foto_url: string | null;
  disponivel: boolean;
  posicao: number;
  controlar_estoque?: boolean;
  quantidade_estoque?: number;
  estoque_minimo?: number;
}

export interface GrupoDeAdicionais {
  id: string;
  loja_id: string;
  nome: string;
  minimo: number;
  maximo: number;
  adicionais?: Adicional[];
}

export interface Adicional {
  id: string;
  loja_id: string;
  grupo_id: string;
  nome: string;
  preco_centavos: number;
  disponivel: boolean;
}

export interface ProdutoGrupo {
  loja_id: string;
  produto_id: string;
  grupo_id: string;
}

export interface BairroAtendido {
  id: string;
  loja_id: string;
  nome: string;
  taxa_centavos: number;
  tempo_estimado_min: number | null;
  ativo: boolean;
}

export interface Cliente {
  id: string;
  loja_id: string;
  nome: string;
  telefone: string;
  criado_em: string;
}

export interface PedidoItemAdicional {
  id: string;
  item_id: string;
  adicional_id: string | null;
  nome_adicional: string;
  preco_centavos: number;
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  produto_id: string | null;
  nome_produto: string;
  preco_unitario_centavos: number;
  quantidade: number;
  observacao: string | null;
  adicionais?: PedidoItemAdicional[];
}

export interface PedidoAndamento {
  id: string;
  pedido_id: string;
  situacao: SituacaoPedido;
  registrado_em: string;
  registrado_por: string | null;
}

export interface Pedido {
  id: string;
  loja_id: string;
  numero: number;
  cliente_id: string | null;
  nome_cliente: string;
  telefone_cliente: string;
  tipo: TipoAtendimento;
  situacao: SituacaoPedido;
  forma_pagamento: FormaPagamento;
  troco_para_centavos: number | null;
  bairro_id: string | null;
  nome_do_bairro: string | null;
  rua: string | null;
  numero_casa: string | null;
  complemento: string | null;
  referencia: string | null;
  subtotal_centavos: number;
  taxa_entrega_centavos: number;
  total_centavos: number;
  observacao: string | null;
  codigo_acompanhamento: string;
  feito_em: string;
  atualizado_em: string;
  mesa_numero?: number | null;
  comanda_identificador?: string | null;
  itens?: PedidoItem[];
}

// Estrutura agrupada do cardápio completo da loja
export interface CardapioDaLoja {
  categorias: Categoria[];
  produtos: Produto[];
  gruposDeAdicionais: GrupoDeAdicionais[];
  produtoGrupos: ProdutoGrupo[];
}

// Parâmetros para criação de pedido (igual ao formato da função criar_pedido do banco)
export interface ItemEntradaCriarPedido {
  produto_id: string;
  quantidade: number;
  observacao?: string | null;
  adicionais?: string[]; // IDs dos adicionais escolhidos
}

export interface DadosCriarPedido {
  loja_id: string;
  nome: string;
  telefone: string;
  tipo: TipoAtendimento;
  pagamento: FormaPagamento;
  itens: ItemEntradaCriarPedido[];
  bairro_id?: string | null;
  rua?: string | null;
  numero_casa?: string | null;
  complemento?: string | null;
  referencia?: string | null;
  troco_para_centavos?: number | null;
  observacao?: string | null;
}

export interface RespostaCriarPedido {
  pedido_id: string;
  numero: number;
  codigo_acompanhamento: string;
  total_centavos: number;
}

export interface RespostaAcompanharPedido {
  numero: number;
  situacao: SituacaoPedido;
  tipo: TipoAtendimento;
  subtotal_centavos: number;
  taxa_entrega_centavos: number;
  total_centavos: number;
  forma_pagamento: FormaPagamento;
  troco_para_centavos: number | null;
  feito_em: string;
  endereco_entrega?: {
    bairro: string | null;
    rua: string | null;
    numero: string | null;
    complemento: string | null;
    referencia: string | null;
  } | null;
  loja: {
    nome: string;
    link: string;
    telefone_whatsapp: string | null;
    cor_principal: string;
    endereco: string | null;
  };
  itens: Array<{
    nome: string;
    quantidade: number;
    preco_unitario_centavos: number;
    observacao?: string | null;
    adicionais?: Array<{
      nome: string;
      preco_centavos: number;
    }>;
  }>;
}

// ==========================================
// MÓDULO DE CAIXA E FINANCEIRO
// ==========================================

export type TipoMovimentoCaixa = 'suprimento' | 'sangria' | 'venda';

export interface MovimentoCaixa {
  id: string;
  sessao_caixa_id: string;
  tipo: TipoMovimentoCaixa;
  motivo: string;
  valor_centavos: number;
  forma_pagamento: FormaPagamento;
  feito_em: string;
  pedido_id?: string | null;
}

export interface SessaoCaixa {
  id: string;
  loja_id: string;
  aberto_em: string;
  fechado_em: string | null;
  status: 'aberto' | 'fechado';
  saldo_inicial_centavos: number;
  total_vendas_dinheiro_centavos: number;
  total_vendas_pix_centavos: number;
  total_vendas_cartao_centavos: number;
  total_suprimentos_centavos: number;
  total_sangrias_centavos: number;
  saldo_esperado_dinheiro_centavos: number;
  saldo_apurado_dinheiro_centavos: number | null;
  diferenca_centavos: number | null;
  observacoes: string | null;
  movimentos?: MovimentoCaixa[];
}

export interface ResumoFinanceiro {
  periodo: 'hoje' | 'semana' | 'mes';
  faturamento_total_centavos: number;
  quantidade_pedidos_concluidos: number;
  quantidade_pedidos_cancelados: number;
  ticket_medio_centavos: number;
  total_por_pagamento: {
    pix_centavos: number;
    cartao_centavos: number;
    dinheiro_centavos: number;
  };
  produtos_mais_vendidos: Array<{
    produto_id: string;
    nome: string;
    quantidade: number;
    total_centavos: number;
  }>;
}

// ==========================================
// MÓDULO DE MESAS E COMANDAS PRESENCIAIS
// ==========================================

export type StatusMesa = 'livre' | 'ocupada' | 'conta';

export interface Mesa {
  id: string;
  loja_id: string;
  numero: number;
  nome_identificador: string; // Ex: "Mesa 01", "Balcão A"
  status: StatusMesa;
  capacidade?: number;
  aberta_em?: string | null;
  cliente_nome?: string | null;
  pedidos_ids: string[];
  subtotal_centavos: number;
  total_centavos: number;
}

// ==========================================
// MÓDULO DE CONTROLE DE ESTOQUE
// ==========================================

export type TipoMovimentacaoEstoque =
  | 'entrada'
  | 'saida_venda'
  | 'perda_descarte'
  | 'ajuste_manual';

export interface MovimentacaoEstoque {
  id: string;
  loja_id: string;
  produto_id: string;
  nome_produto: string;
  tipo: TipoMovimentacaoEstoque;
  quantidade: number; // quantidade movimentada (ex: +24 ou -1)
  estoque_anterior: number;
  estoque_novo: number;
  motivo: string;
  data_hora: string;
}
