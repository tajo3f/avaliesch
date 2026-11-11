# Atualização da identidade visual Schwambach — V4.2

A marca **Sistema de Avaliação Schwambach** fornecida pelo cliente agora é a principal identidade em todas as telas e nos materiais impressos.

## O que mudou

- `public/schwambach-avaliacao-logo.png`: emblema em PNG RGBA, recortado sem preencher o fundo.
- `src/config.js`: apenas `logoPath` passou a apontar ao emblema novo. URL, chave pública, domínio, `demoMode` e demais configurações foram preservadas.
- Imagem de carregamento, tela inicial, formulário de avaliação, login, recuperação, menu da gerência e 12 placas impressas usam o novo emblema.
- `favicon.png`, `icone-192.png`, `icone-512.png`, `icone-96.png` e `apple-touch-icon.png` atualizados com a marca, sem fundo opaco.
- `public/schwambach-logo.png` foi substituído por cópia do novo emblema como compatibilidade para rotas antigas.
- Removidas caixas brancas de fundo na lateral, no login e no emblema da avaliação; sombras são aplicadas à forma da própria imagem.

## Como publicar

1. Descompacte e substitua os arquivos do projeto no GitHub, mantendo a estrutura (`package.json` na raiz).
2. Na Vercel confirme `npm run build`, saída `dist`, depois execute o redeploy/novo commit.
3. Atualize a página com Ctrl + Shift + R; se o favicon não mudar, feche a aba e abra novamente.
4. Teste início, avaliação de cada caixa, painel, login e impressão das placas.

**Nenhuma migration adicional é necessária:** a troca foi feita nos ativos visuais e no frontend.
**A publicação e autenticação reais não foram realizadas neste ambiente.**

## Plaquinhas 8×8 cm (opcional)

Também estão incluídas 12 versões de `public/plaquinhas-8x8/caixa-01.html` até `caixa-12.html`, com QR Code individual e identidade nova. Para imprimir no navegador, escolha escala 100%, sem margens e sem cabeçalho/rodapé.

**NFC não é ativado pelo HTML:** é preciso adquirir uma etiqueta NFC compatível e programar cada uma com a URL exata do mesmo caixa, por exemplo `https://avaliesch.tajodigital.com.br/supermercado-schwambach/caixa-01`. Só disponibilize a placa com a mensagem “Aproxime” após testar fisicamente a etiqueta; o asterisco é um lembrete para a equipe na versão pré-produção.
