-- Executar separadamente no SQL Editor para confirmar o estado atual.
-- Nao altera dados nem tabelas.
select
  to_regclass('public.companies') as tabela_empresas,
  to_regclass('public.evaluation_points') as tabela_caixas,
  to_regclass('public.feedbacks') as tabela_avaliacoes,
  to_regprocedure('public.get_my_context()') as funcao_publica,
  to_regprocedure('private.get_my_context()') as funcao_privada,
  to_regclass('public.billing_invoices') as tabela_faturas;
