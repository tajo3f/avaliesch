// Presenca simples e segura usando RPCs do Supabase, sem dependencias extras.
// Disponivel somente no painel autenticado. Atualizacao a cada 15/30 segundos.
import { supabase } from './supabase.js'

const SESSION_KEY = 'schwambach-panel-presence-tab-v1'
const PING_EVERY_MS = 30000
const READ_EVERY_MS = 15000
const AWAY_AFTER_MS = 120000

let companyId = null
let sessionId = null
let section = 'Visão geral'
let lastInteraction = Date.now()
let pingTimer = null
let readTimer = null
let inFlightPing = false
let inFlightRead = false
let generation = 0
let members = []
let loaded = false
let error = ''
let listener = null
let tracking = false

function tabId() {
  if (sessionId) return sessionId
  try {
    sessionId = sessionStorage.getItem(SESSION_KEY)
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      sessionStorage.setItem(SESSION_KEY, sessionId)
    }
  } catch { sessionId = crypto.randomUUID() }
  return sessionId
}

function active() {
  return !document.hidden && Date.now() - lastInteraction < AWAY_AFTER_MS
}

function notify() {
  if (listener) listener()
}

async function ping() {
  if (!companyId || inFlightPing) return
  const id = companyId
  const ownGeneration = generation
  inFlightPing = true
  try {
    await supabase.rpc('panel_presence_ping', {
      p_company_id: id,
      p_session_id: tabId(),
      p_section: section,
      p_is_active: active()
    })
  } catch (err) {
    if (ownGeneration === generation) {
      error = 'Presença indisponível. Verifique se a nova migration foi executada.'
      notify()
      console.warn('Presença do painel:', err.message)
    }
  } finally { inFlightPing = false }
}

async function refresh() {
  if (!companyId || inFlightRead) return
  const id = companyId
  const ownGeneration = generation
  inFlightRead = true
  try {
    const rows = await supabase.rpc('panel_presence_list', { p_company_id: id })
    if (ownGeneration !== generation || id !== companyId) return
    members = Array.isArray(rows) ? rows : []
    loaded = true
    error = ''
    notify()
  } catch (err) {
    if (ownGeneration === generation) {
      error = 'Não foi possível consultar quem está online.'
      notify()
      console.warn('Lista de usuários online:', err.message)
    }
  } finally { inFlightRead = false }
}

function activity() { lastInteraction = Date.now() }
function visibility() { ping(); if (!document.hidden) refresh() }
function focus() { activity(); ping(); refresh() }
function bindActivity() {
  if (tracking) return
  tracking = true
  document.addEventListener('pointerdown', activity, {passive:true})
  document.addEventListener('keydown', activity, {passive:true})
  document.addEventListener('visibilitychange', visibility)
  window.addEventListener('focus', focus)
}
function unbindActivity() {
  if (!tracking) return
  tracking = false
  document.removeEventListener('pointerdown', activity)
  document.removeEventListener('keydown', activity)
  document.removeEventListener('visibilitychange', visibility)
  window.removeEventListener('focus', focus)
}

export const presence = {
  subscribe(callback) { listener = callback },
  snapshot() { return {members, loaded, error, online: members.filter(m => m.presence_status === 'online').length} },
  start(id, currentSection) {
    if (!id) return
    const normalizedSection = String(currentSection || 'Visão geral').slice(0, 60)
    if (companyId === id) {
      if (section !== normalizedSection) { section = normalizedSection; ping() }
      return
    }
    if (companyId) this.stop()
    generation++
    companyId = id
    section = normalizedSection
    members = []
    loaded = false
    error = ''
    lastInteraction = Date.now()
    bindActivity()
    pingTimer = setInterval(ping, PING_EVERY_MS)
    readTimer = setInterval(refresh, READ_EVERY_MS)
    ping()
    refresh()
  },
  refresh,
  async stop() {
    if (!companyId) return
    const id = companyId
    const sid = tabId()
    generation++
    companyId = null
    clearInterval(pingTimer)
    clearInterval(readTimer)
    pingTimer = null
    readTimer = null
    unbindActivity()
    members = []
    loaded = false
    error = ''
    notify()
    try { await supabase.rpc('panel_presence_leave', {p_company_id:id, p_session_id:sid}) }
    catch (err) { console.warn('Saída da presença:', err.message) }
  }
}
