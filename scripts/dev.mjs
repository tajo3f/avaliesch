// Servidor de desenvolvimento sem dependências, com fallback SPA.
import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
const root=process.cwd(), port=Number(process.env.PORT||4173)
const types={'.html':'text/html;charset=utf-8','.css':'text/css;charset=utf-8','.js':'text/javascript;charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'}
http.createServer(async(req,res)=>{
 const uri=new URL(req.url||'/',`http://localhost:${port}`)
 let f=resolve(root, `.${decodeURIComponent(uri.pathname)}`)
 if(!f.startsWith(root+sep) && f!==root){res.writeHead(403).end();return}
 try {if((await stat(f)).isDirectory()) f=resolve(f,'index.html')} catch {const pub=resolve(root,'public',`.${uri.pathname}`);try{if((await stat(pub)).isFile()) f=pub;else f=resolve(root,'index.html')}catch{f=resolve(root,'index.html')}}
 try {const data=await readFile(f);res.writeHead(200,{'Content-Type':types[extname(f)]||'application/octet-stream','Cache-Control':'no-store'}).end(data)}
 catch{res.writeHead(404).end('Arquivo não encontrado')}
}).listen(port,()=>console.log(`Schwambach local: http://localhost:${port}`))
