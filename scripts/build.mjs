// Build de arquivos estáticos sem dependências npm. Publicável na Vercel.
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const root = process.cwd()
const output = join(root, 'dist')
rmSync(output, {recursive:true,force:true})
mkdirSync(output, {recursive:true})
// Incorpora CSS no HTML para evitar páginas sem estilo caso o host
// redirecione indevidamente requisições de arquivos CSS para index.html.
const html = readFileSync(join(root,'index.html'),'utf8')
const css = readFileSync(join(root,'src','styles.css'),'utf8')
const safeCss = css.replaceAll('</style', '<\\/style')
const bundled = html.replace('<link rel="stylesheet" href="/src/styles.css" />',
  `<style id="schwambach-core-styles">\n${safeCss}\n</style>`)
if (bundled === html) throw Error('Não foi possível incorporar o CSS.')
writeFileSync(join(output,'index.html'), bundled)
cpSync(join(root,'src'), join(output,'src'), {recursive:true})
cpSync(join(root,'public'), output, {recursive:true})
if(!existsSync(join(output,'schwambach-logo.png'))) throw Error('Logo oficial não encontrada')
for(let i=1;i<=12;i++){
 const n=String(i).padStart(2,'0')
 for(const ext of ['svg','png']) if(!existsSync(join(output,'qrcodes',`caixa-${n}.${ext}`))) throw Error(`QR do caixa ${n} ausente`)
}
console.log('SCHWAMBACH: dist/ gerado; 12 QRs locais e arquivos do painel presentes.')
