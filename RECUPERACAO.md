# Recuperacao automatica no Windows

O arquivo watchdog.cjs verifica http://127.0.0.1:6446/health a cada 30 segundos. Confirma a falha antes de iniciar o servidor e aguarda tres minutos para processos novos. Eventos ficam em watchdog.log.

Requer Node.js 18 ou superior e PowerShell atual no caminho do runtime do Codex em %USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe. Esse caminho e usado para identificar os processos do servidor antes de reinicia-los. O servidor recebe NODE_USE_SYSTEM_CA=1.

Para registrar a inicializacao na entrada do Windows, execute no diretorio do projeto:

    node register-recovery.cjs "%CD%"

Isso gera um iniciador oculto watchdog-node.vbs e registra HKCU\Software\Microsoft\Windows\CurrentVersion\Run\OpenCodeFreeProxyRecovery. Para iniciar imediatamente, abra outro terminal e execute node watchdog.cjs. Mantenha somente uma instancia do monitor.

Para desativar a inicializacao automatica:

    reg delete HKCU\Software\Microsoft\Windows\CurrentVersion\Run /v OpenCodeFreeProxyRecovery /f

Encerre tambem o processo node que executa watchdog.cjs, caso esteja ativo. Nao encerre outros processos Node.

Validacao em 06/11/2026: processo do servidor encerrado as 18:25:47; monitor iniciou outro automaticamente as 18:26:09. O catalogo voltou com dez modelos; DeepSeek respondeu diretamente e pelo OpenCodex. A inicializacao apos novo logon foi registrada, sem encerrar a sessao para testa-la.

O monitor nao corrige indisponibilidade dos modelos no servico externo. Uma recuperacao pode interromper chamadas em andamento. Esta alteracao inclui apenas a recuperacao; modificacoes anteriores do servidor local nao fazem parte dela.
