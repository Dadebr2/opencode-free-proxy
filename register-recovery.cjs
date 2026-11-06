const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const dir=process.argv[2]||path.join(os.homedir(),'opencode-free-proxy');
const script=path.join(dir,'watchdog.cjs');
if(!fs.existsSync(script))throw new Error('watchdog.cjs nao encontrado');
const vbs=path.join(dir,'watchdog-node.vbs');
const cmd='"'+process.execPath+'" "'+script+'"';
fs.writeFileSync(vbs,'CreateObject("WScript.Shell").Run "'+cmd.replace(/"/g,'""')+'", 0, True\r\n');
cp.execFileSync('reg.exe',['add','HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run','/v','OpenCodeFreeProxyRecovery','/t','REG_SZ','/d','wscript.exe //B //Nologo "'+vbs+'"','/f'],{windowsHide:true});
console.log('Monitor continuo registrado para iniciar no logon.');
