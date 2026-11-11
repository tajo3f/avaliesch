import {readFileSync} from 'node:fs'
import {strict as assert} from 'node:assert'
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8')
const sql=read('supabase/migrations/202611110004_team_roles.sql')
const form=read('SCHWAMBACH_V4_6_CADASTRAR_EQUIPE_PREENCHER_EMAILS.sql')
const ui=read('src/main.js')
const css=read('src/styles.css')
const invite=read('supabase/functions/invite-user/index.ts')
const checks=[
  ['RBAC no banco aceita fiscal e developer',()=>assert.match(sql,/CHECK \(role IN \('owner','manager','fiscal','developer'\)\)/)],
  ['Banco nao eleva fiscal a gerente',()=>assert.doesNotMatch(sql,/UPDATE.*role\s*=\s*'manager'/i)],
  ['Gerente geral visivel no painel',()=>assert.match(ui,/manager:'Gerente geral'/)],
  ['Fiscal visivel no painel',()=>assert.match(ui,/fiscal:'Fiscal de caixa'/)],
  ['Desenvolvedor visivel no painel',()=>assert.match(ui,/developer:'Desenvolvedor'/)],
  ['Fiscais sem formularios de criacao',()=>assert.match(css,/data-access-role="fiscal"[^\n]*data-new-point/)],
  ['Fiscais sem botao editar funcionario',()=>assert.match(css,/data-access-role="fiscal"[^\n]*data-edit-employee/)],
  ['Convites suportam perfil fiscal',()=>assert.match(invite,/\['owner','manager','fiscal'\]/)],
  ['Sistema nao define senha comum',()=>assert.doesNotMatch(form,/15293748|password\s*[:=]/i)],
  ['Emails desconhecidos identificados como placeholders',()=>assert.match(form,/EMAIL_REAL_DA_FABRICIA/)],
  ['Dev admin tecnico explicito',()=>assert.match(form,/INSERT INTO public\.platform_admins/)],
]
for(const [title,fn] of checks){fn();console.log('OK',title)}
console.log(`${checks.length}/${checks.length} verificacoes de perfis aprovadas.`)
