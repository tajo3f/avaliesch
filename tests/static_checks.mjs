import assert from 'node:assert/strict'
import {readFileSync, existsSync} from 'node:fs'
import {join} from 'node:path'
import {APP_CONFIG} from '../src/config.js'
import {publicUrl} from '../src/lib/utils.js'
const root=process.cwd()
const read=f=>readFileSync(join(root,f),'utf8')
const css=read('src/styles.css')
const html=read('index.html')
const output=read('dist/index.html')
const vercel=JSON.parse(read('vercel.json'))
let passed=0
const check=(label,fn)=>{fn();passed++;console.log('OK',String(passed).padStart(2,'0'),label)}
check('Domínio e Supabase no modo real',()=>{
  assert.equal(APP_CONFIG.baseDomain,'avaliesch.tajodigital.com.br')
  assert.equal(APP_CONFIG.demoMode,false)
  assert.match(APP_CONFIG.supabaseUrl,/^https:\/\/.+\.supabase\.co$/)
  assert.ok(APP_CONFIG.supabaseAnonKey.startsWith('sb_publishable_'))
})
check('HTML raiz e gerado contêm CSS premium interno',()=>{
  for(const str of [html,output]) {
    assert.ok(str.includes('<style id="schwambach-core-styles">'))
    for(const name of ['.premium-home','.home-point-grid','.public-premium','.public-experience','.premium-rating','.premium-login','.premium-qr-grid']) assert.ok(str.includes(name),name)
  }
})
check('Rotas SPA têm fallback para index.html',()=>{
  assert.ok(vercel.routes?.some(x=>x.src==='/(.*)'&&x.dest==='/index.html'))
})
check('Identidade Schwambach e scripts preservados',()=>{
  assert.ok(existsSync(join(root,'dist/schwambach-logo.png')))
  assert.ok(existsSync(join(root,'dist/src/main.js')))
  assert.ok(existsSync(join(root,'dist/src/config.js')))
  assert.ok(existsSync(join(root,'dist/favicon.png')))
})
check('SQL inclui 12 caixas',()=>{
  assert.match(read('supabase/migrations/202611030001_schwambach_setup.sql'),/generate_series\(1,12\)/)
})
check('Telas públicas e login existem',()=>{
  const s=read('src/main.js')
  assert.ok(s.includes('async function publicPage('))
  assert.ok(s.includes('function loginPage('))
  assert.ok(s.includes('function landing('))
})
for(let i=1;i<=12;i++){
 const n=String(i).padStart(2,'0'), slug=`caixa-${n}`
 check(`Caixa ${n}: link oficial, PNG, SVG e placa`,()=>{
   assert.equal(publicUrl('supermercado-schwambach',slug),`https://avaliesch.tajodigital.com.br/supermercado-schwambach/${slug}`)
   for(const ext of ['png','svg']) assert.ok(existsSync(join(root,'dist/qrcodes',`${slug}.${ext}`)))
   assert.ok(existsSync(join(root,'dist/placas',`${slug}.html`)))
 })
}
console.log(`\n${passed} verificações estáticas concluídas com sucesso.`)
