# Correção visual Schwambach

O print enviado mostra a página renderizada sem CSS. O build foi modificado para incorporar `src/styles.css` diretamente ao `dist/index.html`, eliminando a dependência de uma requisição separada de CSS para a aparência básica.

## Implantação
1. Publique esta versão na Vercel, com Root Directory na raiz que contém `package.json`.
2. Build Command: `npm run build` e Output Directory: `dist`.
3. Confirme o deploy em `https://avaliesch.tajodigital.com.br/supermercado-schwambach/caixa-01`.
4. Atualize com Ctrl+Shift+R e teste no celular.
5. Se ainda aparecer sem estilo, abra DevTools > Network e confira respostas dos recursos e o deployment ativo.

O código do Supabase em `src/config.js` foi preservado sem alteração.
Esta correção foi testada por build local e verificações estáticas, não por acesso ao domínio publicado.
