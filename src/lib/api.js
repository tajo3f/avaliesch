import { isDemoMode } from '../config.js'
import { supabase } from './supabase.js'
import { demoData, demoPublicContext } from './demo.js'
import { slugify } from './utils.js'

const UI_SESSION='tajo-avalie-ui-session-v2'
let realCache=null
let lastLoadedAt=0
const CACHE_TTL_MS=15000

// Uma resposta por navegador e por estabelecimento (NÃO é identificação pessoal).
// O Supabase aplica a trava definitiva; o estado local só melhora a experiência.
const REVIEW_LOCK_PREFIX='schwambach-feedback-completed-v1:'
const REVIEW_NONCE_KEY='tajo-evaluation-nonce-v2' // preservar identificadores dos clientes anteriores
let feedbackPending=false
function reviewLock(companySlug){
  try { return JSON.parse(localStorage.getItem(REVIEW_LOCK_PREFIX+companySlug)||'null') } catch { return null }
}
function rememberReview(companySlug,pointSlug){
  localStorage.setItem(REVIEW_LOCK_PREFIX+companySlug,JSON.stringify({pointSlug,completedAt:new Date().toISOString()}))
}
function stableReviewNonce(){
  let nonce=localStorage.getItem(REVIEW_NONCE_KEY)
  if(!nonce){nonce=crypto.randomUUID();localStorage.setItem(REVIEW_NONCE_KEY,nonce)}
  return nonce
}

const getUi=()=>{try{return JSON.parse(localStorage.getItem(UI_SESSION)||'null')}catch{return null}}
const setUi=s=>localStorage.setItem(UI_SESSION,JSON.stringify(s))

function normalizeCompany(c,s){ return {...c,plan_name:s?.plan_name||c.plan_name||'Profissional',monthly_price:Number(s?.monthly_price??c.monthly_price??390),setup_price:Number(s?.setup_price??c.setup_price??390),point_limit:Number(s?.point_limit??c.point_limit??12)} }

export function trendFromFeedbacks(feedbacks=[],days=30,now=new Date()){
  const date=new Date(now)
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
  const keys=Array.from({length:days},(_,i)=>{
    const d=new Date(`${today}T12:00:00Z`); d.setUTCDate(d.getUTCDate()-(days-1-i)); return d.toISOString().slice(0,10)
  })
  const map=new Map(keys.map(k=>[k,{day:k,sum:0,review_count:0}]))
  for(const f of feedbacks){
    const n=Number(f.rating),day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(f.created_at))
    const row=map.get(day);if(row && n>=1 && n<=5){row.sum+=n;row.review_count++}
  }
  return [...map.values()].map(x=>({day:x.day,review_count:x.review_count,average_rating:x.review_count?Number((x.sum/x.review_count).toFixed(2)):null}))
}

async function getCompanyData(companyId){
  const today=new Date(), from=new Date(today); from.setDate(from.getDate()-30)
  const fromIso=from.toISOString(), toIso=today.toISOString()
  const [companies,subs,points,employees,feedbacks,incidents,shifts,team,dashboard,topEmployees,pointPerformance,reasons,hourly]=await Promise.all([
    supabase.select('companies',`select=*&id=eq.${companyId}&limit=1`),
    supabase.select('subscriptions',`select=*&company_id=eq.${companyId}&limit=1`),
    supabase.select('v_points_live',`select=*&company_id=eq.${companyId}&order=name.asc`),
    supabase.select('employees',`select=*&company_id=eq.${companyId}&order=name.asc`),
    supabase.select('v_feedback_details',`select=*&company_id=eq.${companyId}&order=created_at.desc&limit=250`),
    supabase.select('v_incident_details',`select=*&company_id=eq.${companyId}&order=created_at.desc&limit=150`),
    supabase.select('shifts',`select=*&company_id=eq.${companyId}&order=started_at.desc&limit=150`),
    supabase.select('v_team_members',`select=*&company_id=eq.${companyId}&order=created_at.asc`),
    supabase.rpc('dashboard_summary',{p_company_id:companyId,p_from:fromIso,p_to:toIso}),
    supabase.rpc('top_employees',{p_company_id:companyId,p_from:fromIso,p_to:toIso,p_min_reviews:1}),
    supabase.rpc('point_performance',{p_company_id:companyId,p_from:fromIso,p_to:toIso}),
    supabase.rpc('reason_stats',{p_company_id:companyId,p_from:fromIso,p_to:toIso}),
    supabase.rpc('hourly_performance',{p_company_id:companyId,p_from:fromIso,p_to:toIso})
  ])
  if(!companies?.[0]) throw new Error('Empresa não localizada ou acesso não autorizado. Verifique seu perfil no Supabase.')
  // A série temporal é calculada pelo PostgreSQL, sem limite artificial de 250 registros.
  // Em instalações antigas sem a nova migration, exibe uma amostra verificável,
  // nunca os valores fictícios que existiam antes.
  let trend=null,trendSource='supabase'
  try {trend=await supabase.rpc('daily_feedback_trend',{p_company_id:companyId,p_days:30})}
  catch(err){console.warn('Migration da série diária ainda não aplicada:',err.message);trendSource='recentes';trend=trendFromFeedbacks(feedbacks,30)}
  const company=normalizeCompany(companies[0],subs?.[0])
  realCache={company,subscription:subs?.[0]||null,points:points||[],employees:employees||[],feedbacks:feedbacks||[],incidents:incidents||[],shifts:shifts||[],team:team||[],dashboard:dashboard||{},topEmployees:topEmployees||[],pointPerformance:pointPerformance||[],reasons:reasons||[],hourly:hourly||[],history:trend||[],historySource:trendSource,loadedAt:new Date().toISOString()}
  lastLoadedAt=Date.now()
  return realCache
}

export const api={
  demo:isDemoMode,
  uiSession:getUi,
  async signIn(email,password,{admin=false,tenantSlug=null}={}){
    if(isDemoMode()){
      const ok=admin ? (email==='admin@tajo.com'&&password==='123456') : (['proprietario@demo.com','gerente@demo.com'].includes(email)&&password==='123456')
      if(!ok) throw new Error('Credenciais inválidas para a demonstração.')
      const session=admin?{email,role:'platform_admin',isPlatformAdmin:true}:{email,role:email.startsWith('proprietario')?'owner':'manager',companyId:demoData.company.id,companySlug:'mercado-modelo',isPlatformAdmin:false}
      setUi(session); return session
    }
    await supabase.signIn(email,password)
    const ctx=await supabase.rpc('get_my_context',{})
    if(admin){ if(!ctx?.is_platform_admin){await supabase.signOut(); throw new Error('Este usuário não possui acesso ao Admin TAJO.')} const s={email,role:'platform_admin',isPlatformAdmin:true}; setUi(s); return s }
    const memberships=ctx?.memberships||[]
    const member=memberships.find(m=>!tenantSlug||m.company_slug===tenantSlug) || memberships[0]
    if(!member){ await supabase.signOut(); throw new Error('Sua conta não está vinculada a nenhum estabelecimento.') }
    const s={email,role:member.role,companyId:member.company_id,companySlug:member.company_slug,companyName:member.company_name,isPlatformAdmin:false,profile:ctx.profile}; setUi(s); return s
  },
  async signOut(){ localStorage.removeItem(UI_SESSION); realCache=null;lastLoadedAt=0; if(!isDemoMode()) await supabase.signOut() },
  async recover(email){ if(isDemoMode()) return true; return supabase.recover(email) },
  async publicContext(companySlug,pointSlug){ return isDemoMode()?demoPublicContext(companySlug,pointSlug):supabase.rpc('get_public_evaluation_context',{p_company_slug:companySlug,p_point_slug:pointSlug},true) },
  reviewLock,
  async submitFeedback({companySlug,pointSlug,rating,reasons,comment}){
    if(isDemoMode()) return {feedback_id:`demo-${Date.now()}`,received_at:new Date().toISOString()}
    if(reviewLock(companySlug)) throw new Error('ALREADY_REVIEWED_COMPANY')
    if(feedbackPending) throw new Error('SUBMISSION_IN_PROGRESS')
    feedbackPending=true
    try {
      const nonce=stableReviewNonce()
      const result=await supabase.rpc('submit_feedback',{
        p_company_slug:companySlug,p_point_slug:pointSlug,p_rating:rating,
        p_reason_codes:reasons,p_comment:comment||null,p_client_nonce:nonce
      },true)
      rememberReview(companySlug,pointSlug)
      return result
    } catch(err){
      // Se o banco já conhece o token, manter o bloqueio local após a resposta.
      if(err.message?.includes('ALREADY_REVIEWED_COMPANY') || err.message==='RATE_LIMITED') rememberReview(companySlug,pointSlug)
      throw err
    } finally { feedbackPending=false }
  },
  async companyData(force=false){ if(isDemoMode()) return structuredClone(demoData); const s=getUi(); if(!s?.companyId) throw new Error('Sessão sem empresa vinculada.'); if(realCache&&!force&&Date.now()-lastLoadedAt<CACHE_TTL_MS)return realCache; return getCompanyData(s.companyId) },
  async refresh(){ return this.companyData(true) },
  async exportAllFeedbacks(){
    if(isDemoMode())return structuredClone(demoData.feedbacks)
    const s=getUi();if(!s?.companyId)throw new Error('Faça login para exportar as avaliações.')
    const result=[],pageSize=1000
    for(let offset=0;offset<200000;offset+=pageSize){
      const rows=await supabase.select('v_feedback_details',`select=*&company_id=eq.${s.companyId}&order=created_at.desc,id.desc&limit=${pageSize}&offset=${offset}`)
      result.push(...rows)
      if(rows.length<pageSize)return result
    }
    throw new Error('Exportação maior que 200 mil avaliações. Faça a exportação por períodos.')
  },
  async createPoint({name,type='Caixa',slug}){ if(isDemoMode()){demoData.points.push({id:`p${Date.now()}`,name,slug:slug||slugify(name),point_type:type,active:true,employee_id:null,employee_name:null,score:0,reviews:0});return} const s=getUi(); await supabase.insert('evaluation_points',{company_id:s.companyId,name,slug:slug||slugify(name),point_type:type,active:true}); return this.refresh() },
  async createEmployee({name,code,role}){ if(isDemoMode()){demoData.employees.push({id:`e${Date.now()}`,name,employee_code:code||null,role_name:role||null,active:true,score:0,reviews:0});return} const s=getUi(); await supabase.insert('employees',{company_id:s.companyId,name,employee_code:code||null,role_name:role||null,active:true}); return this.refresh() },
  async updatePoint(id,payload){
    const allowed={};for(const k of ['name','point_type','active'])if(Object.hasOwn(payload,k))allowed[k]=payload[k]
    if(!Object.keys(allowed).length)throw new Error('Nenhuma alteração informada.')
    if(isDemoMode()){const p=demoData.points.find(x=>x.id===id);if(!p)throw new Error('Ponto não encontrado.');Object.assign(p,allowed);return}
    const s=getUi();await supabase.update('evaluation_points',`id=eq.${encodeURIComponent(id)}&company_id=eq.${s.companyId}`,allowed);return this.refresh()
  },
  async updateEmployee(id,payload){
    const allowed={};for(const k of ['name','employee_code','role_name','active'])if(Object.hasOwn(payload,k))allowed[k]=payload[k]
    if(!Object.keys(allowed).length)throw new Error('Nenhuma alteração informada.')
    if(isDemoMode()){const e=demoData.employees.find(x=>x.id===id);if(!e)throw new Error('Funcionário não encontrado.');Object.assign(e,allowed);return}
    const s=getUi();await supabase.update('employees',`id=eq.${encodeURIComponent(id)}&company_id=eq.${s.companyId}`,allowed);return this.refresh()
  },
  async startShift(pointId,employeeId){ if(isDemoMode()){ demoData.shifts.filter(x=>x.point_id===pointId&&x.status==='active').forEach(x=>{x.status='ended';x.ended_at=new Date().toISOString()}); demoData.shifts.push({id:`s${Date.now()}`,point_id:pointId,employee_id:employeeId,started_at:new Date().toISOString(),ended_at:null,status:'active'}); return } await supabase.rpc('start_shift',{p_point_id:pointId,p_employee_id:employeeId}); return this.refresh() },
  async endShift(shiftId){ if(isDemoMode()){const s=demoData.shifts.find(x=>x.id===shiftId);if(s){s.status='ended';s.ended_at=new Date().toISOString()}return} const ok=await supabase.rpc('end_shift',{p_shift_id:shiftId});if(ok!==true)throw new Error('Turno não estava ativo ou não foi encontrado.');return this.refresh() },
  async setFeedbackStatus(id,status){ if(isDemoMode()){const f=demoData.feedbacks.find(x=>x.id===id);if(f)f.status=status;return} const ok=await supabase.rpc('set_feedback_status',{p_feedback_id:id,p_status:status});if(ok!==true)throw new Error('A avaliação não pôde ser atualizada.');return this.refresh() },
  async setIncidentStatus(id,status){ if(isDemoMode()){const i=demoData.incidents.find(x=>x.id===id);if(i)i.status=status;return} const ok=await supabase.rpc('set_incident_status',{p_incident_id:id,p_status:status});if(ok!==true)throw new Error('A ocorrência não pôde ser atualizada.');return this.refresh() },
  async updateCompany(payload){ if(isDemoMode()){Object.assign(demoData.company,payload);return} const s=getUi(); await supabase.update('companies',`id=eq.${s.companyId}`,payload); return this.refresh() },
  async inviteUser({email,fullName,role}){ if(isDemoMode()){demoData.team.push({id:`tm${Date.now()}`,full_name:fullName,email,role,active:true});return} const s=getUi(); const result=await supabase.invoke('invite-user',{company_id:s.companyId,email,full_name:fullName,role});if(result?.ok!==true)throw new Error(result?.error||'O convite não foi confirmado. Verifique se a Edge Function está publicada.');return result },
  async adminCompanies(){ if(isDemoMode()) return demoData.platform.companies; return supabase.rpc('admin_companies',{}) },
  async adminCreateCompany(payload){ if(isDemoMode()){const c={id:`c${Date.now()}`,name:payload.name,slug:payload.slug||slugify(payload.name),plan_name:'Profissional',point_count:0,point_limit:payload.point_limit||12,monthly_price:payload.monthly_price||390,status:'active',responsible:payload.responsible,email:payload.email,created_at:new Date().toISOString()};demoData.platform.companies.unshift(c);return c} return supabase.rpc('admin_create_company_v2',{p_name:payload.name,p_slug:payload.slug||slugify(payload.name),p_responsible_name:payload.responsible||null,p_responsible_email:payload.email||null,p_primary_color:'#0A5CFF',p_setup_price:payload.setup_price||390,p_monthly_price:payload.monthly_price||390,p_point_limit:payload.point_limit||12,p_billing_day:payload.billing_day||15}) }
}
