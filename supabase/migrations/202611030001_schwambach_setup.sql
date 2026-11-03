-- SCHWAMBACH | cadastro inicial, sem avaliações ou funcionários fictícios
-- Ajuste o número de caixas no painel depois da instalação.
insert into public.companies
(id,name,slug,logo_text,primary_color,feedback_question,feedback_subtitle,thank_you_message,status,plan_name,setup_price,monthly_price,point_limit,billing_day)
values
('a1111111-1111-4111-8111-111111111111','Supermercado Schwambach','supermercado-schwambach','SS','#08639f','Como foi o atendimento no nosso caixa?','Sua opinião é importante para melhorarmos a cada dia.','A equipe Schwambach agradece sua avaliação!','active','Institucional',0,0,40,15)
on conflict (slug) do update set name=excluded.name, primary_color=excluded.primary_color,feedback_question=excluded.feedback_question,feedback_subtitle=excluded.feedback_subtitle,thank_you_message=excluded.thank_you_message,point_limit=excluded.point_limit;

insert into public.stores(company_id,name,slug)
select id,'Supermercado Schwambach','loja-principal' from public.companies where slug='supermercado-schwambach'
on conflict (company_id,slug) do nothing;

insert into public.evaluation_points(company_id,store_id,name,slug,point_type)
select c.id,s.id,'Caixa '||lpad(n::text,2,'0'),'caixa-'||lpad(n::text,2,'0'),'Caixa'
from public.companies c join public.stores s on s.company_id=c.id
cross join generate_series(1,12) n
where c.slug='supermercado-schwambach' and s.slug='loja-principal'
on conflict (company_id,slug) do nothing;

-- Motivos de avaliação (globais) utilizados pelo formulário público.
insert into public.evaluation_reasons(company_id,code,label,sort_order)
values (null,'atendimento','Atendimento',10),(null,'agilidade','Agilidade',20),(null,'educacao','Educação',30),(null,'tempo-espera','Tempo de espera',40),(null,'organizacao','Organização',50),(null,'resolucao','Resolução do problema',60),(null,'outro','Outro',999)
on conflict do nothing;
