import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {api, REVIEW_COOLDOWN_MS} from '../src/lib/api.js'

const store=new Map()
globalThis.localStorage={
  getItem:key=>store.has(key)?store.get(key):null,
  setItem:(key,value)=>store.set(key,String(value)),
  removeItem:key=>store.delete(key)
}
let requests=[],failNext=false
const database=new Map()
const response=(status,body)=>({ok:status<400,status,text:async()=>JSON.stringify(body)})
globalThis.fetch=async(url,opts={})=>{
  const pathname=new URL(url).pathname
  assert.ok(pathname.endsWith('/rest/v1/rpc/submit_feedback'))
  const req=JSON.parse(opts.body);requests.push(req)
  if(failNext){failNext=false;return response(503,{message:'Falha temporária'})}
  const key=`${req.p_company_slug}/${req.p_point_slug}/${req.p_client_nonce}`
  const now=Date.now()
  const existing=database.get(key)
  if(existing!=null && now-existing<REVIEW_COOLDOWN_MS) return response(409,{message:'POINT_REVIEW_COOLDOWN'})
  database.set(key,now)
  return response(200,{ok:true,feedback_id:`fb-${database.size}`,received_at:new Date(now).toISOString()})
}
let passed=0
const check=(title,test)=>{test();console.log(`OK ${String(++passed).padStart(2,'0')} ${title}`)}
const s=(company='supermercado-schwambach',point='caixa-01')=>({companySlug:company,pointSlug:point,rating:1,reasons:['atendimento'],comment:'teste'})
const company='supermercado-schwambach'
check('Prazo definido de 15 dias',()=>assert.equal(REVIEW_COOLDOWN_MS,1296000000))
check('Novo navegador está livre',()=>assert.equal(api.reviewLock(company,'caixa-01'),null))
await api.submitFeedback(s())
check('Primeira avaliação aprovada',()=>assert.equal(requests.length,1))
check('Data da conclusão guardada por caixa',()=>assert.ok(api.reviewLock(company,'caixa-01')?.nextAllowedAt))
await assert.rejects(()=>api.submitFeedback(s()),/POINT_REVIEW_COOLDOWN/)
check('Mesmo caixa bloqueado localmente',()=>assert.equal(requests.length,1))
await api.submitFeedback(s(company,'caixa-02'))
check('Outro caixa pode ser avaliado',()=>assert.equal(requests.length,2))
check('Cada caixa tem bloqueio próprio',()=>{assert.ok(api.reviewLock(company,'caixa-01'));assert.ok(api.reviewLock(company,'caixa-02'));assert.equal(api.reviewLock(company,'caixa-03'),null)})
await api.submitFeedback(s('outra-empresa','caixa-01'))
check('Outra empresa tem controle independente',()=>assert.equal(requests.length,3))
const apiOtherTab=(await import('../src/lib/api.js?separate_tab')).api
await assert.rejects(()=>apiOtherTab.submitFeedback(s(company,'caixa-01')),/POINT_REVIEW_COOLDOWN/)
check('Nova aba respeita o bloqueio',()=>assert.equal(requests.length,3))
const localKey=`schwambach-feedback-point-v2:${company}:caixa-01`
store.delete(localKey)
await assert.rejects(()=>api.submitFeedback(s()),/POINT_REVIEW_COOLDOWN/)
check('Servidor bloqueia mesmo sem dados locais',()=>assert.equal(requests.length,4))
check('Erro de servidor não cria novo prazo falso',()=>assert.equal(api.reviewLock(company,'caixa-01'),null))
// Reintroduz registros antigos da trava global: não pode bloquear outros caixas.
store.set('schwambach-feedback-completed-v1:'+company,JSON.stringify({pointSlug:'caixa-09',completedAt:new Date().toISOString()}))
check('Trava V4.3 migra apenas para o caixa original',()=>{assert.ok(api.reviewLock(company,'caixa-09'));assert.equal(api.reviewLock(company,'caixa-10'),null)})
await api.submitFeedback(s(company,'caixa-10'))
check('Legado global não impede avaliação de outro caixa',()=>assert.equal(requests.length,5))
// Simula exatos 15 dias: servidor e navegador expiram no mesmo instante.
const lastAt=Date.now()-REVIEW_COOLDOWN_MS-3000
store.set(localKey,JSON.stringify({pointSlug:'caixa-01',completedAt:new Date(lastAt).toISOString()}))
const token=store.get('tajo-evaluation-nonce-v2')
database.set(`${company}/caixa-01/${token}`,lastAt)
check('Bloqueio expira depois de 15 dias',()=>assert.equal(api.reviewLock(company,'caixa-01'),null))
await api.submitFeedback(s())
check('Mesmo caixa permite nova avaliação após 15 dias',()=>assert.equal(requests.length,6))
check('Após nova avaliação, inicia novo período',()=>assert.ok(api.reviewLock(company,'caixa-01')))
// Se não foi enviado, a falha não pode criar trava.
failNext=true
await assert.rejects(()=>api.submitFeedback(s('empresa-offline','caixa-01')),/Falha temporária/)
check('Falha de rede não bloqueia cliente',()=>assert.equal(api.reviewLock('empresa-offline','caixa-01'),null))
await api.submitFeedback(s('empresa-offline','caixa-01'))
check('Reenvio após falha é aceito',()=>assert.ok(api.reviewLock('empresa-offline','caixa-01')))
const [a,b]=await Promise.allSettled([
  api.submitFeedback(s('empresa-concorrente','caixa-02')),
  apiOtherTab.submitFeedback(s('empresa-concorrente','caixa-02'))
])
check('Duas abas no mesmo caixa: apenas um envio aceito',()=>assert.deepEqual([a.status,b.status].sort(),['fulfilled','rejected']))
const [c,d]=await Promise.allSettled([
  api.submitFeedback(s('empresa-entre-caixas','caixa-01')),
  apiOtherTab.submitFeedback(s('empresa-entre-caixas','caixa-02'))
])
check('Duas abas em caixas diferentes: ambos permitidos',()=>assert.deepEqual([c.status,d.status],['fulfilled','fulfilled']))
const migration=readFileSync('supabase/migrations/202611110002_per_point_15day_cooldown.sql','utf8')
check('Chave do bloqueio inclui empresa, caixa e navegador',()=>assert.match(migration,/primary key \(company_id, point_id, client_nonce_hash\)/i))
check('Migração desliga o gatilho global anterior',()=>assert.match(migration,/drop trigger if exists feedbacks_one_review_per_browser on public.feedbacks/i))
check('Migração importa o histórico pela última avaliação por ponto',()=>assert.match(migration,/max\(f.created_at\)/i))
check('Não apaga avaliações nem a tabela antiga',()=>{assert.doesNotMatch(migration,/\bdelete\s+from\s+public\.feedbacks\b|truncate\s+table\s+public\.feedbacks/i);assert.doesNotMatch(migration,/drop table/i)})
check('15 dias aplicados de forma atômica pelo banco',()=>assert.match(migration,/where lock_row.last_feedback_at <= excluded.last_feedback_at - interval '15 days'/i))
check('Trigger aplicado ANTES da inserção',()=>assert.match(migration,/before insert on public.feedbacks/i))
check('Tabela de proteção não exposta a usuários anônimos',()=>assert.match(migration,/revoke all on table private.feedback_point_cooldowns from public, anon, authenticated/i))
console.log(`\n${passed} testes antifraude simulados aprovados; nenhuma conexão real ao Supabase foi feita.`)
