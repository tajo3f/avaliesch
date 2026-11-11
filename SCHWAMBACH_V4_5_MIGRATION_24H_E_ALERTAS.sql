-- SCHWAMBACH AVALIESCH V4.5 — 24 HORAS POR PONTO + ALERTA DE PICOS DE NOTAS BAIXAS
-- APLICAR SOMENTE EM INSTALACOES QUE JA EXECUTARAM A V4.4.
-- Nao remove nem altera avaliacoes, usuarios, caixas ou QR Codes existentes.
-- O prazo de quem avaliou e contado pela data original da ultima avaliacao.
-- Identificacao anonima por navegador; nao comprova identidade nem presenca.

begin;

-- Falhar claramente se a V4.4 ainda nao foi aplicada, em vez de instalar parcialmente.
do $$
begin
  if to_regclass('private.feedback_point_cooldowns') is null then
    raise exception 'V4_4_REQUIRED: aplique primeiro a migration V4.4.';
  end if;
end $$;

-- Mantem os mesmos dados e a mesma funcao da V4.4, alterando somente o prazo.
-- UPSERT atomico evita dois envios simultaneos pelo mesmo navegador no mesmo caixa.
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

  insert into private.feedback_point_cooldowns as lock_row (
    company_id, point_id, client_nonce_hash, last_feedback_at
  ) values (
    new.company_id, new.point_id, new.client_nonce_hash, v_now
  )
  on conflict (company_id, point_id, client_nonce_hash)
  do update set last_feedback_at = excluded.last_feedback_at
  where lock_row.last_feedback_at <= excluded.last_feedback_at - interval '24 hours';

  if not found then
    raise exception using errcode = 'P0001', message = 'POINT_REVIEW_COOLDOWN';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_point_feedback_cooldown() from public, anon, authenticated;
revoke all on table private.feedback_point_cooldowns from public, anon, authenticated;

-- Nao manter dois triggers de bloqueio.
drop trigger if exists feedbacks_one_review_per_browser on public.feedbacks;
drop trigger if exists feedbacks_point_cooldown_15d on public.feedbacks;
drop trigger if exists feedbacks_point_cooldown_24h on public.feedbacks;
create trigger feedbacks_point_cooldown_24h
before insert on public.feedbacks
for each row execute function private.enforce_point_feedback_cooldown();

-- Alerta operacional quando um ponto soma pelo menos 5 notas de 1 a 2
-- em 24 horas e 60% ou mais das avaliacoes desse periodo sao negativas.
-- O alerta NAO declara fraude, nem penaliza automaticamente funcionarios.
-- Reutiliza o sistema de incidentes do Schwambach, sem gravar IP ou identidade.
create or replace function private.flag_negative_spike_24h()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_negative_count integer;
  v_total_count integer;
  v_incident_id uuid;
begin
  if new.rating > 2 then
    return new;
  end if;

  -- Serializa deteccoes simultaneas do mesmo ponto para evitar alertas duplicados.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.point_id::text, 45));

  select count(*)::integer,
         count(*) filter (where f.rating <= 2)::integer
    into v_total_count, v_negative_count
  from public.feedbacks f
  where f.point_id = new.point_id
    and f.company_id = new.company_id
    and f.created_at > now() - interval '24 hours';

  if v_negative_count < 5
     or v_negative_count::numeric / nullif(v_total_count, 0) < 0.60 then
    return new;
  end if;

  if exists (
    select 1 from public.incidents i
    where i.point_id = new.point_id
      and i.company_id = new.company_id
      and i.incident_type = 'negative_daily_spike'
      and i.created_at > now() - interval '24 hours'
  ) then
    return new;
  end if;

  insert into public.incidents (
    company_id, store_id, point_id, employee_id, severity,
    incident_type, title, description, status, source
  ) values (
    new.company_id, new.store_id, new.point_id, new.employee_id,
    'warning', 'negative_daily_spike',
    'Concentração de avaliações negativas',
    'Foram recebidas ' || v_negative_count || ' avaliações de 1 a 2 estrelas em 24 horas, de ' ||
      v_total_count || ' avaliações totais neste ponto. Verifique o contexto antes de qualquer decisão: este alerta não comprova fraude.',
    'new', 'automatic'
  ) returning id into v_incident_id;

  insert into public.incident_feedbacks (incident_id, feedback_id)
  select v_incident_id, f.id
  from public.feedbacks f
  where f.company_id = new.company_id
    and f.point_id = new.point_id
    and f.rating <= 2
    and f.created_at > now() - interval '24 hours'
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function private.flag_negative_spike_24h() from public, anon, authenticated;
drop trigger if exists feedbacks_negative_spike_24h on public.feedbacks;
create trigger feedbacks_negative_spike_24h
after insert on public.feedbacks
for each row execute function private.flag_negative_spike_24h();

commit;

-- CONFERENCIA (executar depois, se desejar):
-- select tgname, tgenabled from pg_trigger
-- where tgrelid='public.feedbacks'::regclass
-- and tgname in ('feedbacks_point_cooldown_15d', 'feedbacks_point_cooldown_24h',
--                'feedbacks_one_review_per_browser', 'feedbacks_negative_spike_24h');
