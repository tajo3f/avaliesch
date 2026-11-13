-- Schwambach Avaliesch - presenca de usuarios no painel (isolada por empresa).
-- Migration INCREMENTAL: nao altera avaliacoes, funcionarios, turnos ou configuracoes.
-- Executar no SQL Editor do projeto Supabase ja instalado.
BEGIN;

CREATE TABLE IF NOT EXISTS public.panel_presence (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  section text NOT NULL DEFAULT 'Visão geral' CHECK (char_length(section) BETWEEN 1 AND 60),
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, user_id, session_id)
);

CREATE INDEX IF NOT EXISTS panel_presence_company_last_seen_idx
  ON public.panel_presence(company_id, last_seen_at DESC);

-- A tabela nao e uma API publica: acesso exclusivamente por duas funcoes autenticadas.
ALTER TABLE public.panel_presence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.panel_presence FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.panel_presence_ping(
  p_company_id uuid,
  p_session_id uuid,
  p_section text,
  p_is_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR p_company_id IS NULL OR p_session_id IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.company_users cu
       WHERE cu.company_id = p_company_id
         AND cu.user_id = v_uid
         AND cu.active = true
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Acesso ao painel não autorizado.';
  END IF;

  INSERT INTO public.panel_presence AS old_row
    (company_id, user_id, session_id, section, is_active, last_seen_at)
  VALUES
    (p_company_id, v_uid, p_session_id,
     left(coalesce(nullif(btrim(p_section), ''), 'Visão geral'), 60),
     coalesce(p_is_active, false), now())
  ON CONFLICT (company_id, user_id, session_id)
  DO UPDATE SET section = EXCLUDED.section,
                is_active = EXCLUDED.is_active,
                last_seen_at = now();

  -- Remove apenas sessoes antigas do proprio usuario, sem afetar historico de avaliacoes.
  DELETE FROM public.panel_presence
  WHERE user_id = v_uid AND last_seen_at < now() - interval '7 days';
END;
$$;

CREATE OR REPLACE FUNCTION public.panel_presence_list(p_company_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  role text,
  section text,
  presence_status text,
  last_seen_at timestamptz,
  active_sessions integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    cu.user_id,
    coalesce(nullif(btrim(p.full_name), ''), nullif(split_part(coalesce(p.email, ''), '@', 1), ''), 'Usuário')::text,
    cu.role::text,
    coalesce(latest.section, '')::text,
    CASE
      WHEN latest.last_seen_at >= now() - interval '90 seconds' AND latest.is_active THEN 'online'
      WHEN latest.last_seen_at >= now() - interval '90 seconds' THEN 'away'
      ELSE 'offline'
    END::text,
    latest.last_seen_at,
    (
      SELECT count(*)::integer FROM public.panel_presence pp2
      WHERE pp2.company_id = cu.company_id
        AND pp2.user_id = cu.user_id
        AND pp2.last_seen_at >= now() - interval '90 seconds'
    ) AS active_sessions
  FROM public.company_users cu
  LEFT JOIN public.profiles p ON p.user_id = cu.user_id
  LEFT JOIN LATERAL (
    SELECT pp.section, pp.is_active, pp.last_seen_at
    FROM public.panel_presence pp
    WHERE pp.company_id = cu.company_id AND pp.user_id = cu.user_id
    ORDER BY
      CASE WHEN pp.last_seen_at >= now() - interval '90 seconds' AND pp.is_active THEN 0 ELSE 1 END,
      pp.last_seen_at DESC
    LIMIT 1
  ) latest ON true
  WHERE cu.company_id = p_company_id
    AND cu.active = true
    AND EXISTS (
      SELECT 1 FROM public.company_users mine
      WHERE mine.company_id = p_company_id
        AND mine.user_id = auth.uid()
        AND mine.active = true
    )
  ORDER BY
    CASE
      WHEN latest.last_seen_at >= now() - interval '90 seconds' AND latest.is_active THEN 0
      WHEN latest.last_seen_at >= now() - interval '90 seconds' THEN 1
      ELSE 2
    END,
    coalesce(nullif(btrim(p.full_name), ''), 'Usuário');
$$;

CREATE OR REPLACE FUNCTION public.panel_presence_leave(p_company_id uuid, p_session_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  DELETE FROM public.panel_presence
   WHERE company_id = p_company_id
     AND session_id = p_session_id
     AND user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.panel_presence_ping(uuid, uuid, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.panel_presence_list(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.panel_presence_leave(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.panel_presence_ping(uuid, uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_presence_list(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.panel_presence_leave(uuid, uuid) TO authenticated;

COMMIT;

-- Verificacao opcional apos executar (nao expõe informacoes sensiveis):
-- SELECT proname FROM pg_proc WHERE proname LIKE 'panel_presence_%' ORDER BY proname;
