import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const main=readFileSync('src/main.js','utf8'),css=readFileSync('src/styles.css','utf8'),api=readFileSync('src/lib/api.js','utf8'),sql=readFileSync('supabase/migrations/202611040001_daily_feedback_trend.sql','utf8'),edge=readFileSync('supabase/functions/invite-user/index.ts','utf8')
const controls=[
  ['+ Novo ponto','[data-new-point]', '[data-save-point]'],
  ['+ Novo funcionário','[data-new-employee]', '[data-save-employee]'],
  ['Editar funcionário','[data-edit-employee]', '[data-save-edit-employee]'],
  ['Editar caixa','[data-edit-point]', '[data-save-edit-point]'],
  ['Iniciar turno','[data-new-shift]', '[data-start-shift]'],
  ['Encerrar turno','[data-end-shift]', 'api.endShift'],
  ['Avaliação','[data-feedback-detail]', '[data-save-feedback]'],
  ['Ocorrência','[data-open-incident]', '[data-save-incident]'],
  ['Novo usuário','[data-invite-user]', '[data-send-invite]'],
  ['Novo cliente admin','[data-admin-new-company]', '[data-save-company]'],
  ['Atualização','[data-refresh]', 'api.refresh'],
  ['Imprimir','[data-print-page]', 'window.print'],
  ['CSV','[data-export-feedback]', 'csvEscape'],
  ['QR Code','[data-point-qr]', 'publicUrl'],
  ['Novo feedback','[data-rating]', 'api.submitFeedback']
]
for(const [label,selector,handler] of controls){assert.ok(main.includes(selector),label);assert.ok(main.includes(handler),label);console.log('OK',label)}
assert.ok(main.includes('setInterval(backgroundRefresh,30000)'))
assert.ok(api.includes("history:trend||[]"))
assert.ok(!api.includes('history:[4.45'))
assert.ok(sql.includes('private.has_company_access'))
assert.ok(edge.includes('https://avaliesch.tajodigital.com.br/nova-senha'))
assert.ok(css.includes('.sidebar-scroll') && css.includes('.sidebar-brandtop'))
console.log('\n15 contratos de interface e 6 invariantes verificados.')

assert.ok(main.includes('function openModal(title,body='),'Modal precisa receber título, corpo e rodapé');
assert.ok(main.includes("insertAdjacentHTML('beforeend',modal(title,body,footer,wide))"),'Renderização de janela real obrigatória');
assert.ok(main.includes('role=\"dialog\"'),'Diálogo acessível obrigatório');
console.log('OK Contrato do motor de modais da V4.1');
