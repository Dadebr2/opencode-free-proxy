# Recuperacao automatica no Windows

Esta versao mantem o OC-Free funcionando sozinho e sem janelas de terminal.

## O que estava errado

O processo interno `opencode serve` encerra sozinho de vez em quando (codigo 3221225786). O servidor continuava respondendo `/health` com status ok, mas recusava os pedidos com erro 502. O monitor acreditava no status e nao agia. Alem disso, ele usava o PowerShell para localizar processos, e essas chamadas expiravam (ETIMEDOUT).

## Como funciona agora

1. **Dentro do servidor:** se o `opencode serve` encerrar, o `server.mjs` o reinicia em 2 segundos, sem tirar a porta 6446 do ar.
2. **Verificacao real:** `/health` testa o `opencode serve` e responde 503 `backend_down` quando ele nao responde.
3. **Monitor:** `watchdog.cjs` verifica a cada 30 segundos. Se a falha se confirmar e o servidor tiver mais de 3 minutos de vida, encerra o processo indicado em `server.pid` e inicia outro. Nao depende do PowerShell.
4. **Windows:** a tarefa `OpenCode Free Proxy Recovery` inicia o monitor no logon e tenta a cada minuto, com uma instancia so e sem limite de tempo. Ela usa `wscript.exe` com `watchdog-node.vbs`, entao nenhuma janela aparece.

## Instalar

Requer Node.js 18+ e `npm install -g @opencode/cli` com a conta OpenCode conectada. Na pasta do projeto:

    npm install
    node register-recovery.cjs "%CD%"

O registro encerra monitor e servidor anteriores do OC-Free para a nova instalacao assumir a porta. Se outra aplicacao ocupar a porta 6446, ele para e avisa.

## Operar

- Reiniciar: `schtasks /Run /TN "OpenCode Free Proxy Recovery"`
- Desativar: `schtasks /Change /TN "OpenCode Free Proxy Recovery" /Disable` e encerrar os processos node de `watchdog.cjs` e `server.mjs`.
- Registros: `watchdog.log` (acoes do monitor) e `opencode-free-proxy.log` (linha `[OC] backend recuperado` quando o servidor reinicia o processo interno).

## Validacao (07/11/2026)

- Processo interno encerrado as 16:25:56; o servidor o reiniciou sozinho em segundos.
- Servidor encerrado as 16:27:36; o monitor iniciou outro as 16:27:58.
- Instalacao nova em pasta limpa; servidor encerrado as 16:55:41 e iniciado de novo as 16:56:08.
- Nenhuma janela visivel nos processos do OC-Free.
- DeepSeek e Combo-OC-Free responderam pelo OpenCodex depois das recuperacoes.

## Limites

- O inicio apos um novo logon esta configurado, mas nao foi testado.
- Pedidos em andamento podem ser interrompidos durante uma recuperacao.
- O monitor nao resolve modelo fora do ar no servico externo.
