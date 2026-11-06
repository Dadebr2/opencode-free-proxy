const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const dir=__dirname;
const log=m=>fs.appendFileSync(path.join(dir,'watchdog.log'),new Date().toISOString()+' '+m+'\n');
async function healthy(){try{const r=await fetch('http://127.0.0.1:6446/health',{signal:AbortSignal.timeout(5000)});return r.ok&&(await r.json()).status==='ok'}catch{return false}}

async function check(){
 if(await healthy())return;
 await new Promise(r=>setTimeout(r,3000)); if(await healthy())return;
 const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe');
 const code="Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -like '*opencode-free-proxy*server.mjs*' } | Select-Object ProcessId,CreationDate | ConvertTo-Json -Compress";
 const raw=cp.execFileSync(runtime,['-NoProfile','-Command',code],{encoding:'utf8',timeout:45000,windowsHide:true}).trim();
 const found=raw?JSON.parse(raw):[];const procs=Array.isArray(found)?found:[found];
 for(const p of procs){if(Date.now()-Date.parse(p.CreationDate)<180000)return;cp.execFileSync('taskkill',['/PID',String(p.ProcessId),'/F'],{windowsHide:true,timeout:10000});}
 const out=fs.openSync(path.join(dir,'opencode-free-proxy.log'),'a'),err=fs.openSync(path.join(dir,'opencode-free-proxy-error.log'),'a');
 cp.spawn(process.execPath,[path.join(dir,'server.mjs')],{cwd:dir,detached:true,windowsHide:true,stdio:['ignore',out,err],env:{...process.env,PROXY_PORT:'6446',NODE_USE_SYSTEM_CA:'1'}}).unref();
 log('Recuperacao automatica: servico iniciado.');
}
let busy=false; async function tick(){if(busy)return;busy=true;try{await check()}catch(e){log('Falha: '+e.message)}finally{busy=false}}
log('Monitor continuo iniciado.');tick();setInterval(tick,30000);
