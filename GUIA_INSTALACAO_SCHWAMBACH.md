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
