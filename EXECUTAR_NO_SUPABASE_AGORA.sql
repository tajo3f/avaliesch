-- Para instalação SCHWAMBACH já existente, execute somente este SQL (sem reinstalar).
-- SCHWAMBACH | Série diária real para o painel (sem dados de demonstração)
-- Seguro para aplicação após migrations já existentes; não altera/exclui avaliações.
create or replace function public.daily_feedback_trend(
  p_company_id uuid,
  p_days integer default 30
)
returns table(day date,average_rating numeric,review_count bigint)
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_timezone text;
  v_today date;
begin
  if (select auth.uid()) is null or not private.has_company_access(p_company_id) then
    raise exception 'FORBIDDEN';
  end if;
  if p_days is null or p_days < 1 or p_days > 90 then
    raise exception 'INVALID_PERIOD';
  end if;
  select c.timezone into v_timezone from public.companies c where c.id=p_company_id;
  if v_timezone is null then raise exception 'COMPANY_NOT_FOUND'; end if;
  v_today := (now() at time zone v_timezone)::date;
  return query
  select (v_today - d.n)::date as day,
         case when count(f.id) = 0 then null else round(avg(f.rating)::numeric, 2) end as average_rating,
         count(f.id)::bigint as review_count
  from generate_series(p_days-1,0,-1) as d(n)
  left join public.feedbacks f
     on f.company_id = p_company_id
    and (f.created_at at time zone v_timezone)::date = (v_today - d.n)
  group by d.n
  order by d.n desc;
end; $$;
revoke all on function public.daily_feedback_trend(uuid,integer) from public,anon,authenticated;
grant execute on function public.daily_feedback_trend(uuid,integer) to authenticated;
