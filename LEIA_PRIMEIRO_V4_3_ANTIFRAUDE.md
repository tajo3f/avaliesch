# SCHWAMBACH AVALIESCH V4.3 — Controle de avaliações repetidas

## Qual foi a única alteração funcional?

Uma participação por **navegador/dispositivo e por estabelecimento**. Após uma avaliação confirmada, o mesmo navegador não poderá enviar outra avaliação para **nenhum dos 12 caixas** do Supermercado Schwambach. O formulário exibirá uma confirmação em vez das estrelas. A trava existe no frontend **e no Supabase**.

O controle existente antes desta versão bloqueava apenas repetição dentro de 90 segundos. Esta versão cria um bloqueio sem data de expiração para o mesmo identificador de navegador.

> IMPORTANTE: isto **não identifica pessoas**. Um cliente pode contornar o controle usando outro celular, janela anônima, navegador diferente ou apagando os dados do site. Tampouco evita que alguém avalie *de casa* usando o link público pela primeira vez. Para comprovar uma compra/presença, o caminho correto é integrar **código único do cupom/compra**, gerado no caixa e validado uma única vez no servidor; QR estático/NFC não garante presença física.

## Ordem de implantação — não pule o SQL

1. Faça backup do banco de produção no Supabase, se disponível, e confirme acesso ao projeto correto.
2. No Supabase: **SQL Editor → New query** e execute **apenas** `supabase/migrations/202611110001_one_review_per_device.sql` (ou o SQL avulso distribuído junto com este ZIP).
3. Confirme `Success. No rows returned`. O script cria tabela de controle em `private`, reaproveita hashes de avaliações antigas e instala um trigger **antes da inserção**. Ele **não apaga** avaliações ou funcionários.
4. Confira o trigger com a consulta abaixo:

```sql
select t.tgname, t.tgenabled
from pg_trigger t
where t.tgrelid = 'public.feedbacks'::regclass
  and t.tgname = 'feedbacks_one_review_per_browser';
```

Resultado esperado: uma linha, `tgenabled = O`.

5. Publique os arquivos do ZIP no repositório do projeto conectado à Vercel; mantenha o `package.json` na **raiz**. Build Command `npm run build`, Output Directory `dist`.
6. Aguarde o deploy como **Ready**. Force uma recarga da página com **Ctrl + Shift + R** (ou limpe apenas o cache do site, sem apagar os dados de armazenamento).
7. Para validar, use um navegador/aparelho que ainda não avaliou (se o mesmo aparelho avaliou anteriormente, seu token histórico já estará bloqueado).

## Teste funcional de validação

- Abra `https://avaliesch.tajodigital.com.br/supermercado-schwambach/caixa-01` em um aparelho de teste.
- Envie **uma única avaliação de teste**, sabendo que ela entrará nos indicadores reais do painel (remova-a das análises por procedimentos administrativos, se necessário; apagar feedback não libera a trava).
- Atualize a página: o formulário precisa ficar indisponível, exibindo “Este navegador já registrou uma avaliação no Schwambach”.
- Abra `/supermercado-schwambach/caixa-07` no mesmo navegador: as estrelas também devem estar bloqueadas.
- Confira no Supabase `public.feedbacks` que somente **uma nova avaliação** foi gravada a partir do navegador de teste.
- No painel, confirme que a média, a lista e os indicadores continuam atualizando normalmente.

## Arquivos alterados

- `src/lib/api.js`: guarda local, token existente preservado, bloqueio de envios repetidos.
- `src/main.js`: tela “participação já registrada” e tratamento amigável da rejeição.
- `supabase/migrations/202611110001_one_review_per_device.sql`: controle no PostgreSQL com chave única por empresa + identificador e backfill do histórico.
- `tests/antifraud_flow.mjs`: simulações de duplicatas, simultaneidade, outras abas e falhas temporárias.
- `package.json`: script de teste V4.3.

## O que não foi alterado

- Logomarca transparente e identidade visual V4.2.
- URLs dos 12 caixas, QR Codes, plaquinhas e NFC.
- Chaves e URL do Supabase em `src/config.js`.
- Configurações de acesso de João e Welinton.
- Banco de funcionários, turnos, relatórios e permissões.

## Estado de verificação

`npm test`: testes estáticos, de API simulada, de contrato da UI e **18 testes antifraude simulados aprovados**.

**Pendente:** execução real da migration no Supabase, teste de gravação com autenticação real e validação de navegador do domínio. O navegador de testes deste ambiente bloqueou `http://127.0.0.1` com `ERR_BLOCKED_BY_ADMINISTRATOR`, então não foi possível homologar o fluxo visual em Chromium por navegação local.
