# Supermercado Schwambach — versão premium v3.0.0

## O que estava errado
As telas premium (`premium-home`, `public-premium`, `premium-login` e `premium-qr-grid`) foram inseridas no JavaScript, **mas não possuíam suas respectivas regras CSS**. Isso explicava a marca enorme, fontes minúsculas e componentes sem layout, mesmo quando o CSS antigo carregava. Agora todas essas classes têm estilos responsivos. O CSS também foi incorporado no HTML raiz e no `dist/index.html` para evitar falhas de carregamento do arquivo de estilo.

## Como publicar corretamente
1. Descompacte este ZIP. **A raiz do repositório deve conter `package.json`, `vercel.json`, `index.html`, `src/` e `public/`. Não envie apenas o ZIP como arquivo ao GitHub.**
2. Substitua os arquivos no repositório GitHub `tajo3f/avaliesch` e faça commit. Se usar GitHub Desktop, copie todos os arquivos para a pasta do repositório e clique em Commit → Push.
3. Abra a Vercel, projeto `avaliesch`. Em Settings → Build and Deployment: Root Directory = raiz; Framework Preset = Other; Build Command = `npm run build`; Output Directory = `dist`. O arquivo `vercel.json` também define as rotas SPA.
4. Em Settings → Domains, mantenha `avaliesch.tajodigital.com.br`. Caso apareça um aviso de DNS, configure o registro exato indicado pela Vercel no provedor do domínio.
5. Aguarde o novo deployment indicar **Ready**. No celular ou em janela anônima, teste `https://avaliesch.tajodigital.com.br/` e `https://avaliesch.tajodigital.com.br/supermercado-schwambach/caixa-01`.
6. Teste um refresh `Ctrl + F5` dentro de `/supermercado-schwambach/painel/login` e do Caixa 01.
7. Cadastre/valide usuários e vinculações no Supabase; teste avaliação real de um caixa. Sem essa etapa a operação não está homologada.

## Links reais esperados
- Início: https://avaliesch.tajodigital.com.br/
- Login: https://avaliesch.tajodigital.com.br/supermercado-schwambach/painel/login
- Avaliação: https://avaliesch.tajodigital.com.br/supermercado-schwambach/caixa-01 até caixa-12
- QR Codes oficiais: `/qrcodes/caixa-01.png` até `/qrcodes/caixa-12.png`
- Placas individuais: `/placas/caixa-01.html` até `/placas/caixa-12.html`

## Banco de dados
O arquivo `src/config.js` preserva exatamente a URL, a chave pública e `demoMode: false` do pacote anterior. Nenhum dado do Supabase foi removido. As migrations continuam no pacote; **não execute novamente uma instalação completa sem backup se o banco já tem dados**.

## Testes desta entrega
- `npm run build`: passou.
- `npm run test:static`: 18 testes passaram (6 de configuração/estrutura + 12 de links/arquivos por caixa).
- A leitura binária dos 12 QR Codes PNG via decodificador OpenCV correspondeu às 12 URLs oficiais.
- Sintaxe JavaScript: passou.
- CSS: 0 erros de parsing.
- Interface renderizada em navegador Chromium headless para home, login e avaliação em 1366px e 390px; nenhuma das seis renderizações apresentou overflow horizontal.
- **Não foi possível testar na Vercel publicada nem fazer login/gravar no Supabase real** nesta execução, pois a conexão externa estava indisponível. Não representar como homologação final de produção.

## Check-list do gerente — homologação de produção
1. Abrir o domínio sem erro de layout em celular e computador.
2. Abrir cada um dos 12 QR Codes com câmera de celular e conferir o número do caixa.
3. Avaliar o Caixa 01 com uma nota teste; ver no painel e no banco.
4. Confirmar login de João (owner) e Welinton (manager) com senhas individuais.
5. Testar iniciar/encerrar turno; uma avaliação durante o turno deve ser vinculada ao operador correto.
6. Atualizar página do painel e do formulário; nenhuma deve cair em 404.
7. Verificar RLS/permissões e ausência de dados sensíveis públicos.
8. Após os testes, excluir/identificar as avaliações de demonstração conforme a política interna.

Incluídas prévias visuais em `PREVIAS/` para apresentação do projeto. Essas prévias são renderizações locais, não capturas da produção.
