param([Parameter(Mandatory=$true)][string]$ProxyDir,[Parameter(Mandatory=$true)][string]$NodePath)
# Registra a tarefa "OpenCode Free Proxy Recovery": inicia no logon, tenta a cada minuto,
# uma instancia, sem limite de tempo, e roda sem janela (wscript + vbs).
$ErrorActionPreference = 'Stop'
$watch = Join-Path $ProxyDir 'watchdog.cjs'
if (-not (Test-Path -LiteralPath $watch)) { throw 'watchdog.cjs nao encontrado' }
$vbs = Join-Path $ProxyDir 'watchdog-node.vbs'
$q = [char]34
$line = 'CreateObject("WScript.Shell").Run "' + $q + $q + $NodePath + $q + $q + ' ' + $q + $q + $watch + $q + $q + '", 0, True'
Set-Content -LiteralPath $vbs -Value @("' Inicia o monitor do OC-Free sem janela.", $line) -Encoding ascii
$action = New-ScheduledTaskAction -Execute (Join-Path $env:SystemRoot 'System32\wscript.exe') -Argument ('//B //Nologo "' + $vbs + '"') -WorkingDirectory $ProxyDir
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$triggers = @((New-ScheduledTaskTrigger -AtLogOn), (New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1)))
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
# Encerra monitor e servidor anteriores (qualquer pasta) para a nova instalacao assumir a porta 6446.
if (Get-ScheduledTask -TaskName 'OpenCode Free Proxy Recovery' -ErrorAction SilentlyContinue) { Stop-ScheduledTask -TaskName 'OpenCode Free Proxy Recovery' }
Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq 'wscript.exe' -and $_.CommandLine -like '*watchdog-node.vbs*') -or ($_.Name -eq 'node.exe' -and ($_.CommandLine -like '*watchdog.cjs*' -or $_.CommandLine -like '*watchdog-opencode-free-proxy*')) } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
$listener = Get-NetTCPConnection -LocalPort 6446 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) { $proc = Get-CimInstance Win32_Process -Filter ("ProcessId=" + $listener.OwningProcess); if ($proc -and $proc.Name -eq 'node.exe' -and $proc.CommandLine -like '*server.mjs*') { Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue; Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $proc.ProcessId } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } } else { throw 'Porta 6446 ocupada por outro programa' } }
Start-Sleep -Seconds 2
Register-ScheduledTask -TaskName 'OpenCode Free Proxy Recovery' -Action $action -Trigger $triggers -Settings $settings -Principal $principal -Force | Out-Null
# Remove mecanismos antigos para evitar duas instancias.
foreach ($old in @('OpenCode Free Proxy (OpenCodex)')) { if (Get-ScheduledTask -TaskName $old -ErrorAction SilentlyContinue) { Unregister-ScheduledTask -TaskName $old -Confirm:$false } }
Remove-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name OpenCodeFreeProxyRecovery -ErrorAction SilentlyContinue
Start-ScheduledTask -TaskName 'OpenCode Free Proxy Recovery'
Write-Output 'Recuperacao automatica registrada e iniciada (sem janela).'
