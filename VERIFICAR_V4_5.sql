-- CONSULTAS DE VERIFICAÇÃO — não modificam registros.
select tgname, tgenabled
from pg_trigger
where tgrelid = 'public.feedbacks'::regclass
  and not tgisinternal
  and tgname in (
    'feedbacks_one_review_per_browser',
    'feedbacks_point_cooldown_15d',
    'feedbacks_point_cooldown_24h',
    'feedbacks_negative_spike_24h'
  )
order by tgname;

select count(*) as pares_caixa_navegador
from private.feedback_point_cooldowns;

select count(*) as alertas_de_pico
from public.incidents
where incident_type = 'negative_daily_spike';
