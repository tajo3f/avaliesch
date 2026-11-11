# Schwambach Avaliesch V4.4 — Uma avaliação por caixa a cada 15 dias

## Regra de negócio

- O navegador que avaliou o **Caixa 01** só poderá avaliar o **Caixa 01** novamente após **15 dias completos** (360 horas).
- O mesmo navegador pode avaliar outro caixa ou ponto (ex.: Caixa 02) sem esperar.
- Após o prazo, o ponto original é liberado; uma nova avaliação começa um novo prazo de 15 dias naquele ponto.
- O sistema mantém o mesmo token anônimo local usado na V4.3. A data inicial das avaliações antigas é aproveitada, por **ponto**, sem reiniciar o relógio na atualização.
- A gerência pode analisar, marcar como resolvido e comparar as avaliações posteriores. **O desbloqueio ocorre após 15 dias, mesmo que a gerência ainda não tenha alterado o status para resolvido.** Se desejar condicionar a liberação também à resolução, essa seria outra regra de negócio.

**Limitação real:** o token não identifica uma pessoa. Outro navegador/celular, uso anônimo ou limpeza dos dados pode permitir uma nova avaliação. Links de QR e NFC estáticos não comprovam presença na loja. Para uma proteção forte contra manipulação, vincule cada avaliação a um código único da compra validado no servidor.

## Publicação — SIGA ESTA ORDEM

1. Confirme que o projeto de produção no Supabase é o mesmo usado no `src/config.js`. Faça backup ou snapshot antes de aplicar migrations.
2. Abra o Supabase > **SQL Editor** e execute **somente** `SCHWAMBACH_V4_4_MIGRATION_15_DIAS_POR_CAIXA.sql`. O arquivo também está em `supabase/migrations/202611110002_per_point_15day_cooldown.sql`.
3. **Não execute novamente** o `INSTALL_ALL` e **não apague** as avaliações antigas. Esta migration remove o *trigger* global da V4.3, mantém sua tabela antiga e cria o novo controle individual por caixa.
4. Publique o conteúdo do ZIP no repositório conectado à Vercel (`tajo3f/avaliesch`). Build Command: `npm run build`; Output Directory: `dist`.
5. Quando o deploy estiver **Ready**, faça recarga forçada (`Ctrl + Shift + R`) no endereço `https://avaliesch.tajodigital.com.br`.
6. Faça testes reais com um navegador de teste, sem apagar feedbacks de produção manualmente.

### Confirmar migrations no SQL Editor

```sql
select tgname, tgenabled
from pg_trigger
where tgrelid = 'public.feedbacks'::regclass
  and tgname in ('feedbacks_one_review_per_browser', 'feedbacks_point_cooldown_15d');
```

Esperado: apenas `feedbacks_point_cooldown_15d`, habilitado (`tgenabled = 'O'`).

```sql
select count(*) as pares_caixa_navegador
from private.feedback_point_cooldowns;
```

### Teste de aceitação (na produção)

1. Um navegador ainda sem avaliações envia uma nota no Caixa 01 -> **registrada**.
2. No mesmo navegador, tenta novamente o Caixa 01 -> **bloqueado**, com mensagem de 15 dias.
3. No mesmo navegador, abre Caixa 02 -> **formulário liberado** e envio permitido.
4. Atualiza o Caixa 01 -> **continua bloqueado**.
5. No Supabase, verifique se apenas uma avaliação nova foi gravada para Caixa 01 neste teste.
6. Confira no painel gerencial se ambas as avaliações aparecem nos respectivos caixas.
7. O teste de liberação **exatamente depois de 15 dias** foi simulado localmente; não foi realizado no banco remoto.

**Não distribua novos QR Codes se a versão publicada ainda não tiver sido testada.** Os links e QR Codes existentes dos 12 caixas foram mantidos.

## Arquivos alterados na V4.4

- `src/lib/api.js` — trava local por empresa/caixa, prazo de 15 dias, migração do armazenamento legado apenas para o ponto respectivo.
- `src/main.js` — mensagem individual por caixa, data de liberação (quando conhecida), outro caixa liberado.
- `supabase/migrations/202611110002_per_point_15day_cooldown.sql` — trava no banco com concorrência segura e histórico por ponto.
- `tests/antifraud_flow.mjs` — 27 testes, incluindo troca de caixa, histórico legado, expiração e abas simultâneas.
- `package.json`, `VERSION.txt` — versão V4.4.

## Testes executados localmente

`npm test` finalizou com sucesso: 18 verificações estáticas, 18 simulações de API, 15 contratos de interface e 27 testes antifraude. O **SQL não foi executado no seu Supabase real** e o funcionamento no domínio final requer validação após o deploy.
