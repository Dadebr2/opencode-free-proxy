param([Parameter(Mandatory=$true)][string]$ProxyDir,[Parameter(Mandatory=$true)][string]$NodePath)
$ErrorActionPreference = 'Stop'
$script = Join-Path $ProxyDir 'watchdog.cjs'
if (-not (Test-Path -LiteralPath $script)) { throw 'watchdog.cjs nao encontrado' }
$action = New-ScheduledTaskAction -Execute $NodePath -Argument ('"' + $script + '"') -WorkingDirectory $ProxyDir
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$triggers = @((New-ScheduledTaskTrigger -AtLogOn), (New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1)))
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'OpenCode Free Proxy Recovery' -Action $action -Trigger $triggers -Settings $settings -Principal $principal -Force | Out-Null
Remove-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name OpenCodeFreeProxyRecovery -ErrorAction SilentlyContinue
Start-ScheduledTask -TaskName 'OpenCode Free Proxy Recovery'
Write-Output 'Monitor registrado e iniciado.'
