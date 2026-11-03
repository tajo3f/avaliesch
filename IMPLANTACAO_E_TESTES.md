# Schwambach Premium — Implantação

## Vercel
Envie o conteúdo desta pasta para a raiz do repositório. Framework: Other. Build Command: `npm run build`. Output Directory: `dist`. A configuração `vercel.json` faz o fallback das rotas para `index.html`, inclusive ao atualizar o painel e páginas dos caixas.

Em Vercel > Project > Settings > Domains, adicione `avaliesch.tajodigital.com.br` e siga as instruções de DNS apresentadas pela Vercel. Verifique o status de domínio ativo antes de distribuir os QR Codes.

## Supabase
O projeto usa a URL e chave publicável já presentes em `src/config.js`. Faça backup antes de alterações em banco existente. Confirme que a empresa `supermercado-schwambach` e os pontos ativos `caixa-01` até `caixa-12` existem no Supabase. Crie usuários em Authentication > Users e vincule-os à tabela `company_users` (owner/manager).

## URLs
- https://avaliesch.tajodigital.com.br/
- https://avaliesch.tajodigital.com.br/supermercado-schwambach/painel/login
- https://avaliesch.tajodigital.com.br/supermercado-schwambach/caixa-01 (até caixa-12)
- Arquivos PNG/SVG: `public/qrcodes/`
- Placas para impressão: `public/placas/`

## Testes e limites
Os 12 QRs PNG foram lidos por decodificador e conferidos contra as URLs oficiais. O build, sintaxe JS e rotas HTTP locais passaram. Não foram testados o login real, escrita/leitura no banco, DNS, Vercel publicado nem regras de autorização em produção. Para homologar, envie uma avaliação real e confira o registro no banco e no painel, inclusive após atualizar a página.
