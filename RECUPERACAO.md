# Recuperacao automatica no Windows

O monitor watchdog.cjs verifica o servico a cada 30 segundos. Se ele nao responder, confirma a falha e tenta inicia-lo novamente. Eventos sao registrados em watchdog.log.

Requer Node.js 18 ou superior e o PowerShell do runtime do Codex em %USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe para identificar o processo antes de reiniciar. O servidor recebe NODE_USE_SYSTEM_CA=1.

Para instalar e iniciar o monitor no Windows, execute na pasta do projeto:

    node register-recovery.cjs "%CD%"

A tarefa OpenCode Free Proxy Recovery inicia no logon e tenta iniciar novamente a cada minuto, mantendo apenas uma instancia e sem limite de duracao. Remover a configuracao antiga do registro evita uma inicializacao duplicada. Para desativar a tarefa, execute:

    schtasks /Change /TN "OpenCode Free Proxy Recovery" /Disable
    schtasks /End /TN "OpenCode Free Proxy Recovery"

Validacao em 07/11/2026: o servico foi interrompido e iniciado novamente pelo monitor; o catalogo apresentou 11 modelos e o DeepSeek respondeu. O inicio em um novo logon nao foi testado. A tarefa levou alguns minutos para iniciar nesta maquina.

O monitor nao corrige indisponibilidade dos modelos externos. Pedidos em andamento podem ser interrompidos durante a recuperacao.
