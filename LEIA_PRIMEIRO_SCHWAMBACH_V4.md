# SCHWAMBACH AVALIESCH • V4.0
## Sistema de avaliação e gestão operacional

**Domínio:** https://avaliesch.tajodigital.com.br  
**Painel:** https://avaliesch.tajodigital.com.br/supermercado-schwambach/painel/login  
**Caixa 01:** https://avaliesch.tajodigital.com.br/supermercado-schwambach/caixa-01  
**Caixa 12:** https://avaliesch.tajodigital.com.br/supermercado-schwambach/caixa-12

### ETAPA 1 — Atualizar o Supabase existente

**Não execute novamente o instalador monolítico do banco.** Não apague tabelas, políticas, usuários ou avaliações.

No mesmo projeto Supabase já utilizado pelo Schwambach, abra **SQL Editor → New query** e execute somente o conteúdo do arquivo:

`EXECUTAR_NO_SUPABASE_AGORA.sql`

Este arquivo cria/atualiza a função SQL `public.daily_feedback_trend`, que calcula a média **real**, dia a dia, para os últimos 30 dias do painel. Não altera registros existentes. A consulta valida o usuário pelo acesso à empresa. Opcionalmente, para verificar a função após executar:

```sql
select proname from pg_proc
where pronamespace='public'::regnamespace
  and proname='daily_feedback_trend';
```

A instalação completa para **projetos novos** permanece disponível em `INSTALL_ALL_SCHWAMBACH.sql`; não a use para atualizar o projeto atual.

### ETAPA 2 — Publicar na Vercel

1. Faça um backup do projeto atual/repositório antes de substituir o conteúdo.
2. Descompacte o ZIP. Envie os arquivos de dentro dele à raiz do repositório `tajo3f/avaliesch`, preservando a estrutura (a raiz deve conter `package.json`, `vercel.json` e `src/`).
3. Faça commit e push para a branch usada pela produção na Vercel, normalmente `main`.
4. Em Vercel → Project → Settings → Build and Deployment, use **Build Command**: `npm run build` e **Output Directory**: `dist`. Root Directory deve ser a pasta que contém `package.json`.
5. Confirme que o novo deployment foi marcado como **Ready** e que `avaliesch.tajodigital.com.br` está atribuído a ele. Atualize o navegador com **Ctrl + Shift + R**.
6. Verifique as páginas `.../caixa-01`, `.../caixa-12` e `.../painel/login`, inclusive após usar F5 na página interna.

O arquivo `vercel.json` contém o fallback das rotas para `index.html`. O CSS principal está incorporado ao HTML durante o build.

### ETAPA 3 — Cadastro / convite de gerentes

A função **Convidar usuário** utiliza uma Supabase Edge Function. Para o botão funcionar de fato, publique `supabase/functions/invite-user/index.ts` no **mesmo projeto Supabase**. Exemplo pela CLI (requer Supabase CLI instalado, login e acesso ao projeto):

```sh
supabase login
supabase functions deploy invite-user --project-ref ftcauaxmqiskwoktwlrg
```

Configure em **Supabase Authentication → URL Configuration → Redirect URLs** a URL:

`https://avaliesch.tajodigital.com.br/nova-senha`

A chave de serviço **não** deve ir para o frontend. A Edge Function usa segredos do próprio projeto Supabase em ambiente de servidor. Se a Edge Function não estiver publicada, o botão informa o erro, em vez de anunciar um convite inexistente.

Usuários previamente criados em Authentication podem ser vinculados ao estabelecimento na tabela `company_users`, conforme a instalação anterior. Perfis `manager` não recebem privilégios da plataforma TAJO.

### ETAPA 4 — Conferência com dados reais

1. Entrar como proprietário e como gerente com contas distintas.
2. Abrir a página do **Caixa 01** e enviar uma avaliação de teste identificada. Verificar o novo registro na tabela `public.feedbacks` do Supabase e no painel.
3. Conferir a nota média e a quantidade de avaliações. Uma nota de 5 em conjunto com uma nota de 1 dá média 3,00 (exemplo matemático, não são os dados reais da empresa).
4. Verificar que o gráfico não contém valores fictícios; caso a migration da etapa 1 esteja faltando, o gráfico usa apenas uma amostra dos registros mais recentes, identificada como tal.
5. Cadastrar e depois editar um **funcionário de teste**, iniciar e encerrar um turno de teste.
6. Editar o nome de um ponto; seu link permanente deve continuar igual. Se todos os 12 pontos previstos estiverem ativos, **Novo ponto** explica o limite em vez de criar além do plano.
7. Acessar **Avaliações → Abrir**, alterar o status e conferir no Supabase. Repetir em **Ocorrências → Gerenciar**.
8. Exportar o CSV: o botão busca todas as páginas de resultados da empresa, não apenas os 250 últimos mostrados na tela.
9. Conferir cada QR Code com a câmera do celular **antes** de imprimir em lote.
10. Apagar/desconsiderar apenas os registros de teste que forem permitidos pela política administrativa da empresa, sem usar SQL destrutivo no projeto de produção.

### Atualização do painel

- O botão **Atualizar dados** força nova leitura do Supabase.
- Enquanto o painel estiver em primeiro plano, há verificação automática aproximadamente **a cada 30 segundos** e ao retornar à aba.
- Os indicadores usam a função `dashboard_summary` para todas as avaliações no período selecionado de 30 dias.
- A série diária usa `daily_feedback_trend`. Não existe mais gráfico fixo de demonstração no código de produção.
- O painel lista as **250 avaliações mais recentes** para navegação rápida; o CSV busca páginas adicionais.

### O que foi testado fora do ambiente de produção

- Build Node.js e integridade do ZIP.
- 18 verificações estáticas do projeto.
- 15 contratos de interface + 6 invariantes de origem e permissão.
- 18 testes de integração de API com **Supabase simulado**, sem gravar no banco do cliente.
- Leitura de 12 QR Codes PNG e conferência das 12 URLs oficiais.

**Limitação importante:** o navegador automatizado deste ambiente bloqueou navegação de testes, portanto **não foi possível executar E2E visual local completo** nem autenticação/gravação no Supabase real. A validação final em produção é necessária antes da apresentação formal como sistema 100% homologado.
