# Supermercado Schwambach — V4.1: correção dos botões

## O que causava o erro

O arquivo `src/main.js` chamava `openModal(titulo, corpo, rodape, largo)` em diversos pontos da interface, mas a implementação da função recebia **somente um parâmetro HTML** e o imprimia cru no `<body>`. Como resultado, clicar em Novo funcionário, Novo ponto, Detalhes, Gerenciar, Iniciar turno e outros não apresentava o formulário esperado.

## O que foi corrigido

- `openModal()` agora recebe corretamente os quatro argumentos e monta a janela com título, formulário e botões.
- Fechamento por Cancelar, X, tecla ESC e clique fora da janela.
- Janela acessível (`role=dialog`), foco inicial e bloqueio da rolagem de fundo.
- Modal único por vez; troca de página e botão voltar removem janelas pendentes.
- Ajustes visuais para janelas em telas pequenas.
- Referência ao arquivo `src/main.js?v=4.1.0` para reduzir reutilização da versão antiga pelo cache do navegador.

## Como publicar

1. Abra o repositório GitHub `tajo3f/avaliesch` e substitua os arquivos da versão anterior pelo **conteúdo** do ZIP, respeitando as pastas internas. Não coloque todos os arquivos dentro de uma subpasta adicional.
2. Confirme na raiz: `package.json`, `vercel.json`, `index.html`, `src/`, `public/`, `supabase/`.
3. Faça commit no branch que a Vercel acompanha. O projeto precisa executar `npm run build` e usar `dist` como Output Directory.
4. Aguarde o status **Ready** do deployment e confirme que o domínio `avaliesch.tajodigital.com.br` está ligado ao deployment atualizado.
5. Atualize com **Ctrl+Shift+R** e teste:
   - Painel > Funcionários > + Novo funcionário: abre formulário.
   - Painel > Pontos / Caixas > Editar: abre formulário.
   - Painel > Ocorrências > Gerenciar: abre a janela de status.
   - Painel > Avaliações > Abrir: abre os detalhes.
6. Se ainda aparecer o comportamento anterior, confira o deployment que responde pelo domínio e abra o DevTools > Rede para verificar se `main.js?v=4.1.0` foi carregado.

## Importante sobre + Novo ponto

A versão está configurada com limite de **12 pontos ativos**. Se os 12 caixas já estiverem cadastrados, o botão exibirá corretamente um aviso de limite do plano; não criará um 13º ponto até que haja capacidade disponível. Esse aviso é um comportamento esperado, não falha do botão.

## Banco de dados

Não há mudança de schema nesta versão. O arquivo `src/config.js`, as migrations, as chaves públicas e o cliente Supabase estão preservados. **Não execute novamente** o instalador SQL para aplicar esta correção.

## Validação

- `npm test`: compilação, 18 verificações estáticas, 18 cenários de API simulados e testes de contratos de interface — aprovado.
- `python tests/modal_browser.py`: 12 cenários de abertura de janela em Chromium local e verificações de fechamento por ESC, Cancelar e clique externo — aprovado.
- O navegador deste ambiente bloqueou acesso HTTP local; por isso, os testes de janela foram isolados e não configuram uma navegação completa pelo aplicativo publicado.
- Não foi realizada alteração nem validação no Supabase ou no domínio de produção. O teste com usuário autenticado em produção ainda precisa ser feito após o deployment.
