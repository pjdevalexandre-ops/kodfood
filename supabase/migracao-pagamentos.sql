-- ==============================================================================
-- KODFOOD: MIGRAÇÃO DE SEGURANÇA E FLUXO DE PAGAMENTOS
-- Execute este script no SQL Editor do Supabase após migracao-pix-mercadopago.sql
-- ==============================================================================

-- 1. Gatilho para garantir que pedidos via PIX nasçam com situação 'aguardando_pix'
-- Evita que pedidos não pagos entrem na fila da cozinha ou toquem aviso sonoro
create or replace function pedido_pix_nasce_aguardando()
returns trigger language plpgsql as $$
begin
  if new.forma_pagamento = 'pix' and new.situacao = 'recebido' then
    new.situacao := 'aguardando_pix';
  end if;
  return new;
end;
$$;

drop trigger if exists gatilho_pedido_pix_aguardando on pedidos;
create trigger gatilho_pedido_pix_aguardando
  before insert on pedidos
  for each row execute function pedido_pix_nasce_aguardando();

-- 2. Tabela segura para isolar credenciais sensíveis (Mercado Pago e senhas)
-- Protege contra vazamento de tokens que anteriormente ficavam em lojas.descricao (público)
create table if not exists loja_segredos (
  loja_id uuid primary key references lojas(id) on delete cascade,
  mercado_pago_access_token text,
  senha_painel_hash text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Ativa Row Level Security com ZERO políticas públicas (apenas a chave de servidor / service_role tem acesso)
alter table loja_segredos enable row level security;
