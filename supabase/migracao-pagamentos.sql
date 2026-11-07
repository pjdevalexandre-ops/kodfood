-- ==============================================================================
-- KODFOOD: MIGRAÇÃO COMPLETA DE PAGAMENTOS E TABELA PEDIDOS
-- Execute este script inteiro no SQL Editor do Supabase (Dashboard > SQL Editor)
-- ==============================================================================

-- 1. Adiciona o status 'aguardando_pix' no enum situacao_pedido (se ainda não existir)
alter type situacao_pedido add value if not exists 'aguardando_pix' before 'recebido';

-- 2. Adiciona as colunas de controle de Pix na tabela pedidos
alter table pedidos add column if not exists pix_pago boolean not null default false;
alter table pedidos add column if not exists pix_copia_e_cola text;
alter table pedidos add column if not exists pix_qr_code_base64 text;
alter table pedidos add column if not exists pix_expira_em text;
alter table pedidos add column if not exists pix_id_transacao text;

-- 3. Adiciona colunas para atendimento presencial (mesas e comandas)
alter table pedidos add column if not exists mesa_numero integer;
alter table pedidos add column if not exists comanda_identificador text;

-- 4. Adiciona colunas na tabela lojas para configuração de Pix
alter table lojas add column if not exists mercado_pago_access_token text;
alter table lojas add column if not exists pix_automatico_ativo boolean not null default false;

-- 5. Gatilho de segurança: pedidos Pix não pagos nascem como 'aguardando_pix'
create or replace function pedido_pix_nasce_aguardando()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.forma_pagamento = 'pix' and coalesce(new.pix_pago, false) = false then
    if new.situacao is distinct from 'cancelado' then
      new.situacao := 'aguardando_pix';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pedido_pix_nasce_aguardando on pedidos;
drop trigger if exists gatilho_pedido_pix_aguardando on pedidos;

create trigger trg_pedido_pix_nasce_aguardando
  before insert on pedidos
  for each row execute function pedido_pix_nasce_aguardando();

-- 6. Tabela isolada para segredos e tokens sensíveis
create table if not exists loja_segredos (
  loja_id                      uuid primary key references lojas(id) on delete cascade,
  mercado_pago_access_token    text,
  mercado_pago_webhook_secret  text,
  atualizado_em                timestamptz not null default now()
);

alter table loja_segredos enable row level security;
drop policy if exists "apenas service role acessa segredos" on loja_segredos;
create policy "apenas service role acessa segredos"
  on loja_segredos for all to service_role
  using (true)
  with check (true);

-- 7. Atualiza o cache do schema da API REST do Supabase
notify pgrst, 'reload config';
