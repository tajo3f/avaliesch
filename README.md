> **Atualização 11/11/2026 — V4.3:** foi adicionada a trava de uma avaliação por navegador para todo o Supermercado Schwambach. Leia `LEIA_PRIMEIRO_V4_3_ANTIFRAUDE.md` e execute a migration incremental ANTES de publicar a nova interface.

# Supermercado Schwambach — Avaliação de Atendimento v4

Sistema proprietário de atendimento e feedback. Projeto estático com JavaScript moderno + Supabase, otimizado para Vercel, com 12 QR Codes individuais e gestão de funcionários e turnos.

**Comece pelo documento [`LEIA_PRIMEIRO_SCHWAMBACH_V4.md`](./LEIA_PRIMEIRO_SCHWAMBACH_V4.md).**

- Código ativo: `src/main.js`, `src/lib/api.js`, `src/lib/supabase.js`, `src/styles.css`, `src/config.js`.
- Banco: `supabase/migrations/`; migração incremental atual em `EXECUTAR_NO_SUPABASE_AGORA.sql`.
- QR Codes: `public/qrcodes/caixa-01..12.{png,svg}`.
- Placas de impressão: `public/placas/caixa-01..12.html`.
- Conta gerencial: Supabase Authentication + tabela `public.company_users`.
- Configuração real do Supabase e domínio preservada em `src/config.js` (chave publicável, **nunca** service role).
- Compilar: `npm run build`; gerar arquivos em `dist/`.
- Testes não destrutivos: `npm test` e `node tests/ui_contract.mjs`.

Nenhuma avaliação de teste foi gravada no projeto real durante a preparação desta versão.
