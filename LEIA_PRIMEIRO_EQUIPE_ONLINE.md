# Supermercado Schwambach — Complemento Equipe online

**Escopo limitado:** somente presença de usuários no painel, sem mudança nas avaliações, bloqueio de 24 horas, ranking, relatórios, 12 QR Codes, funcionários ou autorizações anteriores.

## Instalação (duas etapas, nesta ordem)

1. Faça backup do seu projeto Supabase. Abra **Supabase → SQL Editor → New Query** e execute todo o conteúdo do arquivo `supabase/migrations/202611120001_panel_presence.sql` (cópia avulsa: `INSTALAR_EQUIPE_ONLINE_SCHWAMBACH.sql`). Não execute o instalador completo novamente.
2. Substitua os arquivos no repositório `tajo3f/avaliesch` pelo conteúdo do ZIP (as pastas `src/`, `supabase/` e demais arquivos devem ficar na raiz). Faça commit, aguarde o deploy na Vercel e atualize o painel com Ctrl+Shift+R. Configurações do Supabase e domínio já estão preservados.

### Onde aparecerá

- Contador **Equipe online · N** no cabeçalho do painel.
- Novo item **Equipe online** na barra lateral, disponível a usuários autorizados (incluindo fiscais).
- Lista com nome, cargo, estado (online, ausente, offline), seção do painel e última presença.
- Atualização da lista aproximadamente a cada 15 segundos e registro da presença a cada 30 segundos.

### Como funciona

- **Online:** houve sinal do painel nos últimos 90 segundos e o navegador indica atividade recente.
- **Ausente:** sinal recente, mas a guia está em segundo plano ou sem interação nos últimos 2 minutos.
- **Offline:** nenhum sinal nos últimos 90 segundos; sair com o botão **Sair** remove a sessão normalmente mais rápido.
- **Múltiplas abas:** cada pessoa aparece uma vez, mesmo em mais de uma aba.
- As páginas públicas de avaliação NÃO são monitoradas; apenas a equipe autenticada.

### Teste de funcionamento

1. Entre no painel com Renan ou Welinton e abra **Equipe online**.
2. Faça login no mesmo domínio em outro navegador usando a conta de Fabrícia ou Karen.
3. Aguarde até 15–30 segundos e confirme as duas contas online.
4. Deixe a guia sem interação por cerca de 2 minutos; confira **Ausente**. Ao sair, confira **Offline** (pode demorar até 90 segundos no caso de fechar o navegador sem usar Sair).
5. Confirme que o Dashboard, Avaliações, Ranking, Relatórios e QR Codes continuam iguais e operando normalmente.

### Segurança e limitações

- O SQL é **incremental e idempotente**. Cria apenas `public.panel_presence` e três funções `panel_presence_*`; não contém alterações a feedbacks, turnos, empresas ou usuários.
- A tabela não concede leitura ou escrita direta ao navegador. As funções exigem autenticação e vínculo ativo à mesma empresa; não expõem IPs, geolocalização, avaliações nem informações de clientes.
- A presença é **aproximada**, não localização física nem prova de trabalho. No caso de perda de internet, a conta fica offline após o prazo de expiração.
- Estes são testes locais. A conexão e as permissões RLS/RPC precisam ser validadas após aplicar a migration no Supabase de produção.
