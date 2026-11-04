import assert from 'node:assert/strict'
import {api,trendFromFeedbacks} from '../src/lib/api.js'

const store=new Map()
globalThis.localStorage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,v)=>store.set(key,String(v)),removeItem:key=>store.delete(key)}
const company={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',name:'Supermercado Schwambach',slug:'supermercado-schwambach',point_limit:12}
const points=Array.from({length:12},(_,i)=>({id:`p${i+1}`,company_id:company.id,name:`Caixa ${i+1}`,slug:`caixa-${String(i+1).padStart(2,'0')}`,active:true,point_type:'Caixa'}))
const employees=[{id:'e1',name:'Joana Teste',active:true,role_name:'Operador de caixa'}]
const feedbacks=[{id:'f1',point_id:'p1',point_name:'Caixa 01',rating:1,status:'new',reason_codes:['atendimento'],created_at:new Date().toISOString()}]
const incidents=[{id:'i1',point_name:'Caixa 01',status:'new',severity:'critical',title:'Avaliação crítica',created_at:new Date().toISOString()}]
const shifts=[];const calls=[]
const success=obj=>({ok:true,status:200,text:async()=>JSON.stringify(obj)})
globalThis.fetch=async(url,opts={})=>{
 const p=new URL(url),name=p.pathname,method=opts.method||'GET',payload=opts.body?JSON.parse(opts.body):{}
 calls.push({name,method,payload})
 if(name.endsWith('/auth/v1/token'))return success({access_token:'jwt-test',refresh_token:'jwt-refresh',expires_in:3600})
 if(name.endsWith('/auth/v1/logout'))return success({})
 if(name.endsWith('/rest/v1/rpc/get_my_context'))return success({profile:{full_name:'João'},memberships:[{company_id:company.id,company_slug:company.slug,company_name:company.name,role:'owner'}]})
 if(name.endsWith('/rest/v1/rpc/get_public_evaluation_context'))return success({company,point:points[0],reasons:[]})
 if(name.endsWith('/rest/v1/rpc/submit_feedback')){feedbacks.push({id:'f2',point_id:'p1',point_name:'Caixa 01',rating:payload.p_rating,status:'resolved',created_at:new Date().toISOString()});return success({ok:true})}
 if(name.endsWith('/rest/v1/rpc/dashboard_summary'))return success({average_rating:feedbacks.reduce((s,f)=>s+f.rating,0)/feedbacks.length,evaluations:feedbacks.length,positive_percent:Math.round(feedbacks.filter(f=>f.rating>=4).length/feedbacks.length*100),open_incidents:incidents.filter(i=>i.status==='new').length})
 if(name.endsWith('/rest/v1/rpc/daily_feedback_trend'))return success(trendFromFeedbacks(feedbacks))
 if(name.endsWith('/rest/v1/rpc/top_employees')||name.endsWith('/rest/v1/rpc/reason_stats')||name.endsWith('/rest/v1/rpc/hourly_performance'))return success([])
 if(name.endsWith('/rest/v1/rpc/point_performance'))return success(points.map(p=>({point_id:p.id,average_rating:0,review_count:0})))
 if(name.endsWith('/rest/v1/rpc/start_shift')){shifts.push({id:'s1',point_id:payload.p_point_id,employee_id:payload.p_employee_id,status:'active'});return success('s1')}
 if(name.endsWith('/rest/v1/rpc/end_shift')){shifts[0].status='ended';return success(true)}
 if(name.endsWith('/rest/v1/rpc/set_feedback_status')){feedbacks[0].status=payload.p_status;return success(true)}
 if(name.endsWith('/rest/v1/rpc/set_incident_status')){incidents[0].status=payload.p_status;return success(true)}
 if(name.endsWith('/rest/v1/companies'))return success([company])
 if(name.endsWith('/rest/v1/subscriptions'))return success([{point_limit:12}])
 if(name.endsWith('/rest/v1/v_points_live'))return success(points)
 if(name.endsWith('/rest/v1/employees')){
   if(method==='POST'){const row={id:'e2',...payload};employees.push(row);return success([row])}
   if(method==='PATCH'){Object.assign(employees.find(e=>e.id==='e2'),payload);return success([employees.find(e=>e.id==='e2')])}
   return success(employees)
 }
 if(name.endsWith('/rest/v1/evaluation_points')){
   if(method==='PATCH'){const id=p.searchParams.get('id').replace('eq.','');Object.assign(points.find(x=>x.id===id),payload);return success([points.find(x=>x.id===id)])}
   if(method==='POST'){const row={id:'p13',...payload};points.push(row);return success([row])}
 }
 if(name.endsWith('/rest/v1/v_feedback_details'))return success(feedbacks)
 if(name.endsWith('/rest/v1/v_incident_details'))return success(incidents)
 if(name.endsWith('/rest/v1/shifts'))return success(shifts)
 if(name.endsWith('/rest/v1/v_team_members'))return success([])
 if(name.endsWith('/functions/v1/invite-user'))return success({success:true})
 throw Error(`Chamada não simulada: ${method} ${name}`)
}
let n=0
const pass=msg=>console.log('OK',String(++n).padStart(2,'0'),msg)
const session=await api.signIn('joaopaulo@tajodigital.com.br','SenhaExemplo!',{tenantSlug:'supermercado-schwambach'})
assert.equal(session.role,'owner');pass('Login e vínculo à empresa')
assert.equal((await api.companyData()).dashboard.evaluations,1);pass('Indicador inicial lê o Supabase')
assert.equal((await api.companyData()).history.find(x=>x.review_count)?.average_rating,1);pass('Gráfico usa dados reais')
await api.createEmployee({name:'Funcionário Novo',code:'052',role:'Operador(a) de caixa'})
assert.equal(employees[1].name,'Funcionário Novo');pass('Cadastrar funcionário')
await api.updateEmployee('e2',{name:'Funcionário Editado',active:true})
assert.equal(employees[1].name,'Funcionário Editado');pass('Editar funcionário')
await api.updatePoint('p12',{name:'Caixa Preferencial',active:false})
assert.equal(points[11].active,false);pass('Editar/desativar ponto')
await api.createPoint({name:'Caixa Novo',type:'Caixa',slug:'caixa-novo'})
assert.equal(points.length,13);pass('Cadastrar ponto')
await api.startShift('p1','e2');assert.equal(shifts[0].status,'active');pass('Iniciar turno')
await api.endShift('s1');assert.equal(shifts[0].status,'ended');pass('Encerrar turno')
await api.setFeedbackStatus('f1','analyzing');assert.equal(feedbacks[0].status,'analyzing');pass('Gerenciar status da avaliação')
await api.setIncidentStatus('i1','resolved');assert.equal(incidents[0].status,'resolved');pass('Gerenciar status da ocorrência')
await api.submitFeedback({companySlug:'supermercado-schwambach',pointSlug:'caixa-01',rating:5,reasons:[],comment:'Bom'})
assert.equal(feedbacks.length,2);pass('Enviar avaliação pública')
assert.equal((await api.exportAllFeedbacks()).length,2);pass('Exportar avaliações reais paginadas')
const refreshed=await api.refresh();assert.equal(refreshed.dashboard.evaluations,2);assert.equal(refreshed.dashboard.average_rating,3);pass('Recalcular média após nova avaliação')
assert.equal(refreshed.history.find(x=>x.review_count)?.average_rating,3);pass('Recalcular tendência após avaliação')
assert(calls.some(c=>c.name.endsWith('/rest/v1/rpc/daily_feedback_trend')));pass('RPC de tendência diária consultada')
assert(calls.filter(c=>c.name.endsWith('/rest/v1/rpc/dashboard_summary')).length>=2);pass('Atualização força busca no banco')
await api.signOut();assert.equal(api.uiSession(),null);pass('Logout limpa sessão')
console.log(`\n${n} integrações API simuladas aprovadas (sem tocar o banco real).`)
