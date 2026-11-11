-- SCHWAMBACH V4.4 — Prazo de 15 dias POR PONTO e POR navegador.
-- Executar em Supabase já em produção APÓS a migration V4.3.
-- Esta migration mantém TODOS os feedbacks antigos e preserva a tabela
-- de travas antiga como histórico (ela deixa de ser usada).
-- O prazo independe do status interno do feedback; a gerência pode
-- acompanhar e resolver ocorrências durante os 15 dias.
-- Um navegador/dispositivo diferente pode ter um token diferente;
-- QR Code estático não comprova presença no estabelecimento.

begin;

create schema if not exists private;

-- Um token por ponto: trocar de caixa não causa bloqueio indevido.
create table if not exists private.feedback_point_cooldowns (
  company_id uuid not null references public.companies(id) on delete cascade,
  point_id uuid not null references public.evaluation_points(id) on delete cascade,
  client_nonce_hash text not null check (char_length(client_nonce_hash) between 32 and 128),
  last_feedback_at timestamptz not null,
  primary key (company_id, point_id, client_nonce_hash)
);

-- Importa a ÚLTIMA avaliação histórica de cada navegador EM CADA CAIXA.
-- Nunca altera nem elimina as avaliações existentes.
insert into private.feedback_point_cooldowns (
  company_id, point_id, client_nonce_hash, last_feedback_at
)
select f.company_id, f.point_id, f.client_nonce_hash, max(f.created_at)
from public.feedbacks f
where f.client_nonce_hash is not null
  and char_length(f.client_nonce_hash) between 32 and 128
group by f.company_id, f.point_id, f.client_nonce_hash
on conflict (company_id, point_id, client_nonce_hash)
do update set last_feedback_at = greatest(
  private.feedback_point_cooldowns.last_feedback_at,
  excluded.last_feedback_at
);

-- Importante: retire o trigger de bloqueio GLOBAL da V4.3.
-- A tabela antiga private.feedback_submission_locks fica preservada.
drop trigger if exists feedbacks_one_review_per_browser on public.feedbacks;

create or replace function private.enforce_point_feedback_cooldown()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
begin
  if new.client_nonce_hash is null
     or char_length(new.client_nonce_hash) not between 32 and 128 then
    raise exception using errcode = 'P0001', message = 'CLIENT_NONCE_REQUIRED';
  end if;

  -- INSERT/UPSERT atômico: protege também contra abas simultâneas.
  -- Só atualiza a última avaliação quando já se passaram 15 dias inteiros.
  insert into private.feedback_point_cooldowns as lock_row (
    company_id, point_id, client_nonce_hash, last_feedback_at
  ) values (
    new.company_id, new.point_id, new.client_nonce_hash, v_now
  )
  on conflict (company_id, point_id, client_nonce_hash)
  do update set last_feedback_at = excluded.last_feedback_at
  where lock_row.last_feedback_at <= excluded.last_feedback_at - interval '15 days';

  if not found then
    raise exception using errcode = 'P0001', message = 'POINT_REVIEW_COOLDOWN';
  end if;

  return new;
end;
$$;

revoke all on table private.feedback_point_cooldowns from public, anon, authenticated;
revoke all on function private.enforce_point_feedback_cooldown() from public, anon, authenticated;

drop trigger if exists feedbacks_point_cooldown_15d on public.feedbacks;
create trigger feedbacks_point_cooldown_15d
before insert on public.feedbacks
for each row execute function private.enforce_point_feedback_cooldown();

commit;
