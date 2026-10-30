-- =====================================================================
-- MIGRAÇÃO KODFOOD: SUPORTE A PIX AUTOMÁTICO COM MERCADO PAGO
-- Rode este script no SQL Editor do Supabase se desejar colunas dedicadas.
-- =====================================================================

-- 1. Adiciona novo status na enum situacao_pedido
alter type situacao_pedido add value if not exists 'aguardando_pix' before 'recebido';

-- 2. Adiciona colunas para controle do Pix Dinâmico na tabela pedidos
alter table pedidos add column if not exists pix_copia_e_cola text;
alter table pedidos add column if not exists pix_qr_code_base64 text;
alter table pedidos add column if not exists pix_expira_em text;
alter table pedidos add column if not exists pix_id_transacao text;
alter table pedidos add column if not exists pix_pago boolean not null default false;

-- 3. Adiciona colunas de configuração do lojista na tabela lojas
alter table lojas add column if not exists mercado_pago_access_token text;
alter table lojas add column if not exists pix_automatico_ativo boolean not null default false;

-- Recarrega o cache de schema da API REST do Supabase
notify pgrst, 'reload config';
