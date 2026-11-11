-- SCHWAMBACH V4.6 - CARGOS E PERMISSOES POR PERFIL
-- Execute uma vez depois das migrations existentes, em banco de producao com backup.
-- Nao cria usuarios e nao altera senhas; cria os tipos de perfil fiscal e desenvolvedor.
BEGIN;

DO $check$
BEGIN
 IF to_regclass('public.company_users') IS NULL THEN
  RAISE EXCEPTION 'Instale a estrutura base do Schwambach antes da V4.6';
 END IF;
END
$check$;

ALTER TABLE public.company_users DROP CONSTRAINT IF EXISTS company_users_role_check;
ALTER TABLE public.company_users ADD CONSTRAINT company_users_role_check
 CHECK (role IN ('owner','manager','fiscal','developer'));

COMMENT ON COLUMN public.company_users.role IS
 'owner: proprietario; manager: gerente geral; fiscal: fiscal de caixa (acesso operacional limitado); developer: acesso tecnico (sem elevar privilegios sozinho).';

-- O RLS existente permite a fiscais ler os dados da propria empresa.
-- Nao recebem permissao de criar pontos, funcionarios, alterar configuracoes
-- ou convidar usuarios. Os RPCs de status de avaliacoes/ocorrencias permitem
-- acesso operacional de usuarios vinculados e ativos; os de turno continuam
-- reservados a owner/manager/admin.
COMMIT;
