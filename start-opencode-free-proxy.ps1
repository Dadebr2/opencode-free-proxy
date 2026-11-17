<# Inicia manualmente o monitor do OC-Free, sem janela. O monitor sobe o servidor. #>
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$task = Get-ScheduledTask -TaskName 'OpenCode Free Proxy Recovery' -ErrorAction SilentlyContinue
if ($task) { Start-ScheduledTask -TaskName $task.TaskName; exit 0 }
Start-Process -WindowStyle Hidden -FilePath (Get-Command node -ErrorAction Stop).Source -ArgumentList @('"' + (Join-Path $dir 'watchdog.cjs') + '"') -WorkingDirectory $dir
