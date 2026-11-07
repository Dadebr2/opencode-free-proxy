const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const dir=__dirname, pidFile=path.join(dir,'server.pid');
const log=m=>fs.appendFileSync(path.join(dir,'watchdog.log'),new Date().toISOString()+' '+m+'\n');
async function healthy(){try{const r=await fetch('http://127.0.0.1:6446/health',{signal:AbortSignal.timeout(8000)});if(!r.ok)return false;const j=await r.json();return j.status==='ok'&&j.models>0}catch{return false}}
function readPid(){try{return JSON.parse(fs.readFileSync(pidFile,'utf8'))}catch{return null}}
function alive(pid){try{process.kill(pid,0);return true}catch{return false}}
let lastStart=0;
async function check(){
 if(await healthy())return;
 if(Date.now()-lastStart<180000)return;
 await new Promise(r=>setTimeout(r,5000)); if(await healthy())return;
 const info=readPid();
 if(info&&alive(info.pid)){
  if(Date.now()-info.started<180000)return;
  log('Servico sem resposta; encerrando processo '+info.pid);
  try{cp.execFileSync('taskkill',['/PID',String(info.pid),'/T','/F'],{windowsHide:true,timeout:15000})}catch(e){log('Aviso ao encerrar: '+e.message)}
  await new Promise(r=>setTimeout(r,3000));
 }
 try{fs.unlinkSync(pidFile)}catch{}
 const out=fs.openSync(path.join(dir,'opencode-free-proxy.log'),'a'),err=fs.openSync(path.join(dir,'opencode-free-proxy-error.log'),'a');
 cp.spawn(process.execPath,[path.join(dir,'server.mjs')],{cwd:dir,detached:true,windowsHide:true,stdio:['ignore',out,err],env:{...process.env,PROXY_PORT:'6446',NODE_USE_SYSTEM_CA:'1'}}).unref();
 lastStart=Date.now();
 log('Recuperacao automatica: servico iniciado.');
}
let busy=false;async function tick(){if(busy)return;busy=true;try{await check()}catch(e){log('Falha: '+e.message)}finally{busy=false}}
log('Monitor continuo iniciado.');tick();setInterval(tick,30000);

