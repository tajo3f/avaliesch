// Build de arquivos estáticos sem dependências npm. Publicável na Vercel.
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const root = process.cwd()
const output = join(root, 'dist')
rmSync(output, {recursive:true,force:true})
mkdirSync(output, {recursive:true})
// Sincroniza o CSS diretamente no HTML final, para resistir a falhas de
// roteamento/MIME de arquivos separados na Vercel e em deploy estático.
const html = readFileSync(join(root,'index.html'),'utf8')
const css = readFileSync(join(root,'src','styles.css'),'utf8')
const safeCss = css.replaceAll('</style', '<\\/style')
const styleBlock = `<style id="schwambach-core-styles">\n${safeCss}\n</style>`
let bundled
if(/<style id="schwambach-core-styles">[\s\S]*?<\/style>/.test(html)) {
  bundled = html.replace(/<style id="schwambach-core-styles">[\s\S]*?<\/style>/, styleBlock)
} else if (html.includes('<link rel="stylesheet" href="/src/styles.css" />')) {
  bundled = html.replace('<link rel="stylesheet" href="/src/styles.css" />', styleBlock)
} else throw Error('Sem ponto de incorporação do CSS no HTML')
writeFileSync(join(output,'index.html'), bundled)
cpSync(join(root,'src'), join(output,'src'), {recursive:true})
cpSync(join(root,'public'), output, {recursive:true})
if(!existsSync(join(output,'schwambach-logo.png'))) throw Error('Logo oficial não encontrada')
for(let i=1;i<=12;i++){
 const n=String(i).padStart(2,'0')
 for(const ext of ['svg','png']) if(!existsSync(join(output,'qrcodes',`caixa-${n}.${ext}`))) throw Error(`QR do caixa ${n} ausente`)
}
console.log('SCHWAMBACH: dist/ gerado; 12 QRs locais e arquivos do painel presentes.')
