import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {api} from '../src/lib/api.js'

const map=new Map()
globalThis.localStorage={
  getItem:k=>map.has(k)?map.get(k):null,
  setItem:(k,v)=>map.set(k,String(v)),
  removeItem:k=>map.delete(k)
}
const inserts=new Set(),requests=[]
let failNext=false
const reply=(status,body)=>({ok:status<400,status,text:async()=>JSON.stringify(body)})
globalThis.fetch=async(url,opts={})=>{
  const endpoint=new URL(url).pathname
  if(!endpoint.endsWith('/rest/v1/rpc/submit_feedback'))throw Error(`RPC inesperada: ${endpoint}`)
  const p=JSON.parse(opts.body); requests.push(p)
  if(failNext){failNext=false;return reply(503,{message:'Falha temporária'})}
  const key=`${p.p_company_slug}::${p.p_client_nonce}`
  if(inserts.has(key))return reply(409,{message:'ALREADY_REVIEWED_COMPANY'})
  inserts.add(key)
  return reply(200,{ok:true,feedback_id:`feedback-${inserts.size}`})
}
let passed=0
const check=(name,test)=>{test(); console.log(`OK ${String(++passed).padStart(2,'0')} ${name}`)}
const sample=(companySlug='supermercado-schwambach',pointSlug='caixa-01')=>({
 companySlug,pointSlug,rating:1,reasons:['atendimento'],comment:'Teste'
})
check('Sem bloqueio em navegador novo',()=>assert.equal(api.reviewLock('supermercado-schwambach'),null))
const first=await api.submitFeedback(sample())
check('Primeira avaliação registrada',()=>assert.equal(first.ok,true))
check('Controle salvo após confirmação do servidor',()=>assert.equal(api.reviewLock('supermercado-schwambach').pointSlug,'caixa-01'))
await assert.rejects(()=>api.submitFeedback(sample()),/ALREADY_REVIEWED_COMPANY/)
check('Segunda avaliação do mesmo caixa bloqueada localmente',()=>assert.equal(requests.length,1))
await assert.rejects(()=>api.submitFeedback(sample('supermercado-schwambach','caixa-09')),/ALREADY_REVIEWED_COMPANY/)
check('Avaliação de outro caixa bloqueada após participação',()=>assert.equal(requests.length,1))
const apiNewTab=(await import('../src/lib/api.js?new_tab=1')).api
await assert.rejects(()=>apiNewTab.submitFeedback(sample()),/ALREADY_REVIEWED_COMPANY/)
check('Outra aba respeita o bloqueio persistente',()=>assert.equal(requests.length,1))
await api.submitFeedback(sample('empresa-parceira','caixa-01'))
check('Trava isolada por estabelecimento',()=>assert.equal(requests.length,2))
map.delete('schwambach-feedback-completed-v1:supermercado-schwambach')
await assert.rejects(()=>api.submitFeedback(sample()),/ALREADY_REVIEWED_COMPANY/)
check('Servidor rejeita repetição mesmo sem marca local',()=>assert.equal(requests.length,3))
check('Erro de duplicidade recupera bloqueio local',()=>assert.ok(api.reviewLock('supermercado-schwambach')))
failNext=true
await assert.rejects(()=>api.submitFeedback(sample('empresa-temporaria')),/Falha temporária/)
check('Erro de rede não bloqueia quem não conseguiu enviar',()=>assert.equal(api.reviewLock('empresa-temporaria'),null))
await api.submitFeedback(sample('empresa-temporaria'))
check('Tentativa posterior bem-sucedida recebe bloqueio',()=>assert.ok(api.reviewLock('empresa-temporaria')))
// Duas abas concorrendo: bloqueio garantido por chave única na simulação do banco.
const oldNonce=map.get('tajo-evaluation-nonce-v2');
const [a,b]=await Promise.allSettled([
 api.submitFeedback(sample('empresa-simultanea','caixa-02')),
 apiNewTab.submitFeedback(sample('empresa-simultanea','caixa-03'))
])
check('Duas abas simultâneas: apenas uma operação aceita',()=>assert.deepEqual([a.status,b.status].sort(),['fulfilled','rejected']))
check('Token estável usado em caixas diferentes',()=>assert.equal(map.get('tajo-evaluation-nonce-v2'),oldNonce))
const sql=readFileSync('supabase/migrations/202611110001_one_review_per_device.sql','utf8')
check('Migration cria trava por empresa e navegador',()=>assert.match(sql,/primary key \(company_id, client_nonce_hash\)/i))
check('Migration recupera histórico sem excluir avaliações',()=>{assert.match(sql,/from public\.feedbacks f/);assert.doesNotMatch(sql,/\bdelete\s+from\s+public\.feedbacks\b|\btruncate\b/i)})
check('Bloqueio dispara antes do INSERT da avaliação',()=>assert.match(sql,/before insert on public\.feedbacks/))
check('Erro de duplicidade está implementado na migration',()=>assert.match(sql,/message='ALREADY_REVIEWED_COMPANY'/))
check('Dados da trava não são expostos ao público',()=>assert.match(sql,/revoke all on table private\.feedback_submission_locks from public, anon, authenticated/i))
console.log(`\n${passed} testes antifraude simulados aprovados. Banco real não foi acessado.`)
