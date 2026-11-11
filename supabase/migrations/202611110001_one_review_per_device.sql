-- SCHWAMBACH V4.3 — Uma avaliação por navegador/dispositivo, por estabelecimento.
-- Aplicar SOMENTE ESTA MIGRATION no SQL Editor do Supabase já em produção.
-- Preserva avaliações, caixas, turnos e contas existentes. Não reinstala o banco.
--
-- IMPORTANTE: este controle identifica somente o token persistente do navegador.
-- Não comprova identidade de uma pessoa nem presença física na loja.
-- Apagar os dados do navegador, usar uma janela anônima ou outro aparelho
-- pode gerar outro token. Para prevenção mais forte, exigir código único de compra.

begin;

create schema if not exists private;

-- Lock independente das avaliações: mesmo se existirem registros antigos
-- duplicados, a migration não precisa excluir nem alterar avaliações.
create table if not exists private.feedback_submission_locks (
  company_id uuid not null references public.companies(id) on delete cascade,
  client_nonce_hash text not null,
  first_point_id uuid references public.evaluation_points(id) on delete set null,
  first_recorded_at timestamptz not null default now(),
  primary key (company_id, client_nonce_hash),
  constraint feedback_submission_nonce_hash_len check (char_length(client_nonce_hash) between 32 and 128)
);

-- Os hashes já registrados no histórico também passam a ser bloqueados.
-- DISTINCT ON mantém apenas o primeiro registro por navegador/empresa;
-- avaliações antigas NÃO são apagadas nem reescritas.
insert into private.feedback_submission_locks (
  company_id, client_nonce_hash, first_point_id, first_recorded_at
)
select distinct on (f.company_id, f.client_nonce_hash)
  f.company_id, f.client_nonce_hash, f.point_id, f.created_at
from public.feedbacks f
where f.client_nonce_hash is not null
  and char_length(f.client_nonce_hash) between 32 and 128
order by f.company_id, f.client_nonce_hash, f.created_at asc, f.id asc
on conflict (company_id, client_nonce_hash) do nothing;

-- O banco rejeita duplicatas ANTES de registrar a avaliação ou criar
-- alertas. A chave primária impede simultaneidade e corridas entre abas.
create or replace function private.prevent_repeat_feedback()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.client_nonce_hash is null
     or char_length(new.client_nonce_hash) not between 32 and 128 then
    raise exception using errcode='P0001', message='CLIENT_NONCE_REQUIRED';
  end if;

  insert into private.feedback_submission_locks (
    company_id, client_nonce_hash, first_point_id, first_recorded_at
  ) values (
    new.company_id, new.client_nonce_hash, new.point_id, new.created_at
  ) on conflict (company_id, client_nonce_hash) do nothing;

  if not found then
    raise exception using errcode='P0001', message='ALREADY_REVIEWED_COMPANY';
  end if;

  return new;
end;
$$;

revoke all on table private.feedback_submission_locks from public, anon, authenticated;
revoke all on function private.prevent_repeat_feedback() from public, anon, authenticated;

drop trigger if exists feedbacks_one_review_per_browser on public.feedbacks;
create trigger feedbacks_one_review_per_browser
before insert on public.feedbacks
for each row execute function private.prevent_repeat_feedback();

-- Validação não destrutiva pós-instalação:
-- select count(*) from private.feedback_submission_locks;
-- select tgname, tgenabled from pg_trigger
-- where tgrelid='public.feedbacks'::regclass and tgname='feedbacks_one_review_per_browser';

commit;
