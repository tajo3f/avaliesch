# Sistema de Avaliação — Supermercado Schwambach

## 1. Supabase (projeto novo)

1. Crie um projeto Supabase **novo**, ou faça backup e revise antes de alterar um projeto existente.
2. Abra **SQL Editor** e execute **INSTALL_ALL_SCHWAMBACH.sql**, uma única vez. **Não execute também as migrations**, pois este arquivo já reúne o esquema e o cadastro inicial.
3. Alternativa com CLI: execute `supabase link --project-ref SEU_PROJECT_REF` e `supabase db push` para aplicar os arquivos da pasta `supabase/migrations` em ordem. **Não execute INSTALL_ALL_SCHWAMBACH.sql nessa alternativa.**
4. Em **Project Settings → API**, copie **Project URL** e a **publishable/anon key pública**. Nunca use `service_role` no navegador.
5. No arquivo `src/config.js`, configure `supabaseUrl` e `supabaseAnonKey`. O `demoMode` já está `false`; sem credenciais reais o sistema não estará conectado.
6. Em **Authentication → Users**, crie o usuário do gerente (e-mail e senha). Em seguida, execute o SQL abaixo no SQL Editor, trocando o e-mail pelo cadastrado:

```sql
insert into public.company_users(company_id,user_id,role,active)
select c.id,u.id,'owner',true
from public.companies c cross join auth.users u
where c.slug='supermercado-schwambach' and u.email='GERENTE@EXEMPLO.COM'
on conflict (company_id,user_id) do update set role='owner',active=true;
```

7. Para deploy, use Vercel com framework **Vite**, build `npm run build`, output `dist`. Configure em Supabase Auth a URL do site em **URL Configuration**, inclusive redirects de recuperação de senha.
8. Acesse `https://SEU-DOMINIO/supermercado-schwambach/painel/login`. Os links dos caixas são `/supermercado-schwambach/caixa-01` até `/caixa-12`.
9. Cadastre os operadores reais e abra os turnos pelo painel. **Não há funcionários nem avaliações fictícias inseridos no banco.**
10. Antes de distribuir QR Codes, valide a coleta de avaliação e o controle de acesso com usuários de teste.

## Observações

- A logo oficial está em `public/schwambach-logo.png`. O sistema também a exibe no formulário público, independentemente de `logo_url` no banco.
- O sistema mantém o modelo e as funções Supabase da versão fornecida. Não foi possível executar testes integrados no seu projeto Supabase sem acesso ao banco.
- Há 12 caixas iniciais apenas como exemplo operacional; ajuste a quantidade conforme a loja.
- A publicação de avaliações exige cuidados com LGPD e comunicação interna sobre uso dos dados de desempenho dos funcionários.
- **Não execute o SQL em banco que já tenha a versão anterior sem antes revisar migrações e realizar backup.**

## Correção 42723 — function already exists in schema private

A versão anterior usava `ALTER FUNCTION public.get_my_context() SET SCHEMA private` sem verificar se a mesma função já estava em `private`, o que gerava o erro 42723 ao reinstalar.

1. Abra `DIAGNOSTICO_SQL.sql`, execute separadamente no Supabase SQL Editor e verifique as tabelas e as funções.
2. **Se você está reinstalando o pacote inteiro:** faça backup e execute apenas o novo `INSTALL_ALL_SCHWAMBACH.sql`. Não execute em seguida as migrations isoladas.
3. **Se as tabelas já existem e a instalação parou exatamente na migração 006:** é possível executar `CORRIGIR_ERRO_42723.sql` para reorganizar RPCs de forma independente, mas ele não aplica as mudanças das migrações posteriores (007 e setup Schwambach). Se ainda não aplicou 007/Schwambach, use o instalador completo revisado após backup.
4. Não apague `private.get_my_context()`, nem execute `DROP FUNCTION ... CASCADE` ou reset de banco.

**Limites de validação:** o SQL foi conferido estruturalmente, mas não foi conectado ao seu banco. A instalação em Supabase real precisa ser verificada no seu projeto.
**Config:** `src/config.js` contém a URL e chave publicável que você forneceu; `baseDomain` ainda precisa do domínio Vercel verdadeiro.
