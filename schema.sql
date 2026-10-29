-- =====================================================================
-- Sistema de pedidos para lanchonetes e restaurantes (multiloja)
-- PostgreSQL, pensado para rodar no Supabase.
-- Dinheiro sempre em centavos (inteiro). Ex.: R$ 12,90 = 1290.
-- Rode o arquivo inteiro de uma vez no SQL Editor.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------

create type tipo_atendimento as enum ('entrega', 'retirada');

create type forma_pagamento as enum ('pix', 'dinheiro', 'cartao_na_entrega');

create type situacao_pedido as enum (
  'recebido',
  'confirmado',
  'em_preparo',
  'pronto_para_retirada',
  'saiu_para_entrega',
  'entregue',
  'cancelado'
);

create type papel_na_equipe as enum ('dono', 'atendente', 'entregador');


-- ---------------------------------------------------------------------
-- Lojas e equipe
-- ---------------------------------------------------------------------

create table lojas (
  id                      uuid primary key default gen_random_uuid(),
  link                    text not null unique
                          check (link ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nome                    text not null,
  descricao               text,
  telefone_whatsapp       text,
  logo_url                text,
  capa_url                text,
  cor_principal           text not null default '#B4412B'
                          check (cor_principal ~ '^#[0-9A-Fa-f]{6}$'),
  endereco                text,
  aberta                  boolean not null default false,
  ativa                   boolean not null default true,
  aceita_entrega          boolean not null default true,
  aceita_retirada         boolean not null default true,
  pedido_minimo_centavos  integer not null default 0
                          check (pedido_minimo_centavos >= 0),
  ultimo_numero_pedido    integer not null default 0,
  criada_em               timestamptz not null default now()
);

create table equipe (
  id          uuid primary key default gen_random_uuid(),
  loja_id     uuid not null references lojas(id) on delete cascade,
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  nome        text not null,
  papel       papel_na_equipe not null default 'atendente',
  unique (loja_id, usuario_id)
);

create table horarios_funcionamento (
  id          uuid primary key default gen_random_uuid(),
  loja_id     uuid not null references lojas(id) on delete cascade,
  dia_semana  smallint not null check (dia_semana between 0 and 6), -- 0 = domingo
  abre        time not null,
  fecha       time not null
);


-- ---------------------------------------------------------------------
-- Cardápio
-- ---------------------------------------------------------------------

create table categorias (
  id        uuid primary key default gen_random_uuid(),
  loja_id   uuid not null references lojas(id) on delete cascade,
  nome      text not null,
  posicao   integer not null default 0,
  ativa     boolean not null default true
);

create table produtos (
  id            uuid primary key default gen_random_uuid(),
  loja_id       uuid not null references lojas(id) on delete cascade,
  categoria_id  uuid references categorias(id) on delete set null,
  nome          text not null,
  descricao     text,
  preco_centavos integer not null check (preco_centavos >= 0),
  foto_url      text,
  disponivel    boolean not null default true,
  posicao       integer not null default 0
);

-- Ex.: "Escolha o molho" (mínimo 1, máximo 1) ou "Turbine seu lanche" (0 a 5)
create table grupos_de_adicionais (
  id        uuid primary key default gen_random_uuid(),
  loja_id   uuid not null references lojas(id) on delete cascade,
  nome      text not null,
  minimo    smallint not null default 0 check (minimo >= 0),
  maximo    smallint not null default 1 check (maximo >= minimo)
);

create table adicionais (
  id              uuid primary key default gen_random_uuid(),
  loja_id         uuid not null references lojas(id) on delete cascade,
  grupo_id        uuid not null references grupos_de_adicionais(id) on delete cascade,
  nome            text not null,
  preco_centavos  integer not null default 0 check (preco_centavos >= 0),
  disponivel      boolean not null default true
);

create table produto_grupos (
  loja_id     uuid not null references lojas(id) on delete cascade,
  produto_id  uuid not null references produtos(id) on delete cascade,
  grupo_id    uuid not null references grupos_de_adicionais(id) on delete cascade,
  primary key (produto_id, grupo_id)
);


-- ---------------------------------------------------------------------
-- Entrega
-- ---------------------------------------------------------------------

create table bairros_atendidos (
  id                    uuid primary key default gen_random_uuid(),
  loja_id               uuid not null references lojas(id) on delete cascade,
  nome                  text not null,
  taxa_centavos         integer not null default 0 check (taxa_centavos >= 0),
  tempo_estimado_min    integer,
  ativo                 boolean not null default true,
  unique (loja_id, nome)
);


-- ---------------------------------------------------------------------
-- Clientes e pedidos
-- ---------------------------------------------------------------------

create table clientes (
  id         uuid primary key default gen_random_uuid(),
  loja_id    uuid not null references lojas(id) on delete cascade,
  nome       text not null,
  telefone   text not null,
  criado_em  timestamptz not null default now(),
  unique (loja_id, telefone)
);

create table pedidos (
  id                      uuid primary key default gen_random_uuid(),
  loja_id                 uuid not null references lojas(id) on delete cascade,
  numero                  integer not null,
  cliente_id              uuid references clientes(id) on delete set null,
  nome_cliente            text not null,
  telefone_cliente        text not null,
  tipo                    tipo_atendimento not null,
  situacao                situacao_pedido not null default 'recebido',
  forma_pagamento         forma_pagamento not null,
  troco_para_centavos     integer,
  bairro_id               uuid references bairros_atendidos(id) on delete set null,
  nome_do_bairro          text,
  rua                     text,
  numero_casa             text,
  complemento             text,
  referencia              text,
  subtotal_centavos       integer not null default 0,
  taxa_entrega_centavos   integer not null default 0,
  total_centavos          integer not null default 0,
  observacao              text,
  codigo_acompanhamento   uuid not null unique default gen_random_uuid(),
  feito_em                timestamptz not null default now(),
  atualizado_em           timestamptz not null default now(),
  unique (loja_id, numero)
);

-- Nome e preço são copiados na hora da compra: mudar o cardápio depois
-- não altera pedidos antigos.
create table pedido_itens (
  id                        uuid primary key default gen_random_uuid(),
  pedido_id                 uuid not null references pedidos(id) on delete cascade,
  produto_id                uuid references produtos(id) on delete set null,
  nome_produto              text not null,
  preco_unitario_centavos   integer not null,
  quantidade                integer not null check (quantidade > 0),
  observacao                text
);

create table pedido_item_adicionais (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid not null references pedido_itens(id) on delete cascade,
  adicional_id    uuid references adicionais(id) on delete set null,
  nome_adicional  text not null,
  preco_centavos  integer not null
);

create table pedido_andamento (
  id             uuid primary key default gen_random_uuid(),
  pedido_id      uuid not null references pedidos(id) on delete cascade,
  situacao       situacao_pedido not null,
  registrado_em  timestamptz not null default now(),
  registrado_por uuid
);


-- ---------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------

create index on equipe (usuario_id);
create index on categorias (loja_id, posicao);
create index on produtos (loja_id, categoria_id);
create index on adicionais (grupo_id);
create index on bairros_atendidos (loja_id);
create index on horarios_funcionamento (loja_id);
create index on pedidos (loja_id, feito_em desc);
create index on pedidos (loja_id, situacao);
create index on pedido_itens (pedido_id);
create index on pedido_item_adicionais (item_id);
create index on pedido_andamento (pedido_id);


-- ---------------------------------------------------------------------
-- Funções de apoio
-- ---------------------------------------------------------------------

-- Lojas em que o usuário logado trabalha. Usada nas regras de segurança.
create or replace function minhas_lojas()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select loja_id from equipe where usuario_id = auth.uid();
$$;

-- Cria a loja e já coloca quem cadastrou como dono.
create or replace function cadastrar_loja(
  p_nome_da_loja text,
  p_link text,
  p_seu_nome text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  id_da_loja uuid;
begin
  if auth.uid() is null then
    raise exception 'É preciso estar logado para cadastrar uma loja.';
  end if;

  insert into lojas (nome, link)
  values (trim(p_nome_da_loja), lower(trim(p_link)))
  returning id into id_da_loja;

  insert into equipe (loja_id, usuario_id, nome, papel)
  values (id_da_loja, auth.uid(), trim(p_seu_nome), 'dono');

  return id_da_loja;
end;
$$;

revoke execute on function cadastrar_loja(text, text, text) from public, anon;
grant execute on function cadastrar_loja(text, text, text) to authenticated;


-- Cria o pedido a partir do que o cliente escolheu no link da loja.
-- Os preços são lidos aqui no banco: o valor que vier do navegador é ignorado.
--
-- Formato de p_itens:
--   [
--     { "produto_id": "...", "quantidade": 2, "observacao": "sem cebola",
--       "adicionais": ["id-do-adicional", "id-do-adicional"] }
--   ]
--
-- Ainda falta (fase 2): conferir mínimo e máximo de escolhas de cada grupo
-- de adicionais. Por enquanto essa regra fica só no front.
create or replace function criar_pedido(
  p_loja_id               uuid,
  p_nome                  text,
  p_telefone              text,
  p_tipo                  tipo_atendimento,
  p_pagamento             forma_pagamento,
  p_itens                 jsonb,
  p_bairro_id             uuid    default null,
  p_rua                   text    default null,
  p_numero_casa           text    default null,
  p_complemento           text    default null,
  p_referencia            text    default null,
  p_troco_para_centavos   integer default null,
  p_observacao            text    default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  loja_atual           lojas%rowtype;
  bairro_escolhido     bairros_atendidos%rowtype;
  produto_escolhido    produtos%rowtype;
  adicional_escolhido  adicionais%rowtype;
  entrada              jsonb;
  id_adicional         uuid;
  id_do_cliente        uuid;
  id_do_pedido         uuid;
  id_do_item           uuid;
  numero_do_pedido     integer;
  codigo               uuid;
  unidades             integer;
  soma_adicionais      integer;
  subtotal             integer := 0;
  taxa_de_entrega      integer := 0;
  total                integer;
begin
  select * into loja_atual from lojas where id = p_loja_id and ativa;
  if not found then
    raise exception 'Loja não encontrada.';
  end if;
  if not loja_atual.aberta then
    raise exception 'A loja está fechada no momento.';
  end if;
  if p_tipo = 'entrega' and not loja_atual.aceita_entrega then
    raise exception 'Esta loja não faz entregas.';
  end if;
  if p_tipo = 'retirada' and not loja_atual.aceita_retirada then
    raise exception 'Esta loja não tem retirada no balcão.';
  end if;
  if coalesce(trim(p_nome), '') = '' or coalesce(trim(p_telefone), '') = '' then
    raise exception 'Informe seu nome e telefone.';
  end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'O pedido está sem itens.';
  end if;

  if p_tipo = 'entrega' then
    select * into bairro_escolhido
    from bairros_atendidos
    where id = p_bairro_id and loja_id = p_loja_id and ativo;
    if not found then
      raise exception 'Esta loja não entrega nesse bairro.';
    end if;
    if coalesce(trim(p_rua), '') = '' then
      raise exception 'Informe a rua para a entrega.';
    end if;
    taxa_de_entrega := bairro_escolhido.taxa_centavos;
  end if;

  insert into clientes (loja_id, nome, telefone)
  values (p_loja_id, trim(p_nome), trim(p_telefone))
  on conflict (loja_id, telefone) do update set nome = excluded.nome
  returning id into id_do_cliente;

  -- Número sequencial dentro da loja (#1, #2, #3...)
  update lojas
  set ultimo_numero_pedido = ultimo_numero_pedido + 1
  where id = p_loja_id
  returning ultimo_numero_pedido into numero_do_pedido;

  insert into pedidos (
    loja_id, numero, cliente_id, nome_cliente, telefone_cliente,
    tipo, forma_pagamento, bairro_id, nome_do_bairro,
    rua, numero_casa, complemento, referencia,
    taxa_entrega_centavos, observacao
  )
  values (
    p_loja_id, numero_do_pedido, id_do_cliente, trim(p_nome), trim(p_telefone),
    p_tipo, p_pagamento, p_bairro_id, bairro_escolhido.nome,
    nullif(trim(p_rua), ''), nullif(trim(p_numero_casa), ''),
    nullif(trim(p_complemento), ''), nullif(trim(p_referencia), ''),
    taxa_de_entrega, nullif(trim(p_observacao), '')
  )
  returning id, codigo_acompanhamento into id_do_pedido, codigo;

  for entrada in select * from jsonb_array_elements(p_itens) loop
    unidades := (entrada->>'quantidade')::integer;
    if unidades is null or unidades < 1 or unidades > 50 then
      raise exception 'Quantidade inválida em um dos itens.';
    end if;

    select * into produto_escolhido
    from produtos
    where id = (entrada->>'produto_id')::uuid
      and loja_id = p_loja_id
      and disponivel;
    if not found then
      raise exception 'Um dos produtos não está mais disponível.';
    end if;

    insert into pedido_itens (
      pedido_id, produto_id, nome_produto, preco_unitario_centavos,
      quantidade, observacao
    )
    values (
      id_do_pedido, produto_escolhido.id, produto_escolhido.nome,
      produto_escolhido.preco_centavos, unidades,
      nullif(trim(entrada->>'observacao'), '')
    )
    returning id into id_do_item;

    soma_adicionais := 0;

    for id_adicional in
      select t.valor::uuid
      from jsonb_array_elements_text(coalesce(entrada->'adicionais', '[]'::jsonb)) as t(valor)
    loop
      select a.* into adicional_escolhido
      from adicionais a
      join produto_grupos pg on pg.grupo_id = a.grupo_id
      where a.id = id_adicional
        and pg.produto_id = produto_escolhido.id
        and a.disponivel;
      if not found then
        raise exception 'Um dos adicionais não está disponível.';
      end if;

      insert into pedido_item_adicionais (item_id, adicional_id, nome_adicional, preco_centavos)
      values (id_do_item, adicional_escolhido.id, adicional_escolhido.nome,
              adicional_escolhido.preco_centavos);

      soma_adicionais := soma_adicionais + adicional_escolhido.preco_centavos;
    end loop;

    subtotal := subtotal + (produto_escolhido.preco_centavos + soma_adicionais) * unidades;
  end loop;

  if subtotal < loja_atual.pedido_minimo_centavos then
    raise exception 'O pedido está abaixo do valor mínimo da loja.';
  end if;

  total := subtotal + taxa_de_entrega;

  if p_pagamento = 'dinheiro'
     and p_troco_para_centavos is not null
     and p_troco_para_centavos < total then
    raise exception 'O valor informado para troco é menor que o total do pedido.';
  end if;

  update pedidos
  set subtotal_centavos   = subtotal,
      total_centavos      = total,
      troco_para_centavos = case when p_pagamento = 'dinheiro' then p_troco_para_centavos end
  where id = id_do_pedido;

  return jsonb_build_object(
    'pedido_id', id_do_pedido,
    'numero', numero_do_pedido,
    'codigo_acompanhamento', codigo,
    'total_centavos', total
  );
end;
$$;


-- Página de acompanhamento: quem tem o código do pedido consegue ver o andamento,
-- sem precisar de login.
create or replace function acompanhar_pedido(p_codigo uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'numero', p.numero,
    'situacao', p.situacao,
    'tipo', p.tipo,
    'total_centavos', p.total_centavos,
    'feito_em', p.feito_em,
    'loja', jsonb_build_object(
      'nome', l.nome,
      'telefone_whatsapp', l.telefone_whatsapp
    ),
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object('nome', i.nome_produto, 'quantidade', i.quantidade))
      from pedido_itens i
      where i.pedido_id = p.id
    ), '[]'::jsonb)
  )
  from pedidos p
  join lojas l on l.id = p.loja_id
  where p.codigo_acompanhamento = p_codigo;
$$;


-- ---------------------------------------------------------------------
-- Gatilhos dos pedidos
-- ---------------------------------------------------------------------

create or replace function pedidos_antes_de_atualizar()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger pedidos_atualizado_em
  before update on pedidos
  for each row execute function pedidos_antes_de_atualizar();

create or replace function pedidos_registrar_andamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.situacao is distinct from old.situacao then
    insert into pedido_andamento (pedido_id, situacao, registrado_por)
    values (new.id, new.situacao, auth.uid());
  end if;
  return new;
end;
$$;

create trigger pedidos_andamento
  after insert or update of situacao on pedidos
  for each row execute function pedidos_registrar_andamento();


-- ---------------------------------------------------------------------
-- Regras de segurança (Row Level Security)
-- ---------------------------------------------------------------------

-- Lojas: qualquer pessoa vê as lojas ativas (é o que o link mostra);
-- só a equipe altera, e só os campos de configuração.
alter table lojas enable row level security;

create policy "lojas ativas sao publicas" on lojas
  for select to anon, authenticated
  using (ativa);

create policy "equipe altera a propria loja" on lojas
  for update to authenticated
  using (id in (select minhas_lojas()))
  with check (id in (select minhas_lojas()));

revoke update on lojas from authenticated;
grant update (
  nome, descricao, telefone_whatsapp, logo_url, capa_url, cor_principal,
  endereco, aberta, aceita_entrega, aceita_retirada, pedido_minimo_centavos
) on lojas to authenticated;

-- Equipe: cada um enxerga os colegas da própria loja.
alter table equipe enable row level security;

create policy "equipe ve a propria equipe" on equipe
  for select to authenticated
  using (loja_id in (select minhas_lojas()));

-- Cardápio, entrega e horários: leitura aberta, escrita só da equipe da loja.
do $$
declare
  nome_da_tabela text;
begin
  foreach nome_da_tabela in array array[
    'categorias', 'produtos', 'grupos_de_adicionais', 'adicionais',
    'produto_grupos', 'bairros_atendidos', 'horarios_funcionamento'
  ]
  loop
    execute format('alter table %I enable row level security', nome_da_tabela);

    execute format(
      'create policy "leitura publica" on %I for select to anon, authenticated using (true)',
      nome_da_tabela
    );

    execute format(
      'create policy "equipe gerencia" on %I for all to authenticated
         using (loja_id in (select minhas_lojas()))
         with check (loja_id in (select minhas_lojas()))',
      nome_da_tabela
    );
  end loop;
end;
$$;

-- Clientes e pedidos: só a equipe da loja. Cliente cria pedido pela função
-- criar_pedido() e acompanha por acompanhar_pedido().
alter table clientes enable row level security;
alter table pedidos enable row level security;
alter table pedido_itens enable row level security;
alter table pedido_item_adicionais enable row level security;
alter table pedido_andamento enable row level security;

create policy "equipe ve os clientes" on clientes
  for select to authenticated
  using (loja_id in (select minhas_lojas()));

create policy "equipe ve os pedidos" on pedidos
  for select to authenticated
  using (loja_id in (select minhas_lojas()));

create policy "equipe atualiza os pedidos" on pedidos
  for update to authenticated
  using (loja_id in (select minhas_lojas()))
  with check (loja_id in (select minhas_lojas()));

-- No pedido, a equipe só pode mudar a situação.
revoke update on pedidos from authenticated;
grant update (situacao) on pedidos to authenticated;

create policy "equipe ve os itens" on pedido_itens
  for select to authenticated
  using (exists (
    select 1 from pedidos p
    where p.id = pedido_itens.pedido_id
      and p.loja_id in (select minhas_lojas())
  ));

create policy "equipe ve os adicionais dos itens" on pedido_item_adicionais
  for select to authenticated
  using (exists (
    select 1
    from pedido_itens i
    join pedidos p on p.id = i.pedido_id
    where i.id = pedido_item_adicionais.item_id
      and p.loja_id in (select minhas_lojas())
  ));

create policy "equipe ve o andamento" on pedido_andamento
  for select to authenticated
  using (exists (
    select 1 from pedidos p
    where p.id = pedido_andamento.pedido_id
      and p.loja_id in (select minhas_lojas())
  ));


-- ---------------------------------------------------------------------
-- Tempo real: o painel recebe pedido novo sem precisar atualizar a página
-- ---------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table pedidos;
  end if;
end;
$$;
