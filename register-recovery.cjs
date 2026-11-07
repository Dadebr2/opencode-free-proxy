const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const dir=path.resolve(process.argv[2]||path.join(os.homedir(),'opencode-free-proxy'));
const script=path.join(dir,'watchdog.cjs');
const setup=path.join(__dirname,'register-recovery.ps1');
if(!fs.existsSync(script)) throw new Error('watchdog.cjs nao encontrado');
const result=cp.spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',setup,'-ProxyDir',dir,'-NodePath',process.execPath],{stdio:'inherit',windowsHide:true});
if(result.error) throw result.error;
if(result.status!==0) process.exit(result.status||1);
