# Recuperacao automatica no Windows (v1.1.0 definitiva)

Esta versao mantem o OC-Free funcionando de forma resiliente, permanente e 100% headless (sem qualquer janela visivel).

## Diagnostico da falha pos-reinicio

Apos o reinicio da maquina, ocorreram duas condicoes criticas que deixavam o servico fora do ar:
1. **/health bloqueante causava falsos positivos**: durante chamadas longas de inferencia (ex.: DeepSeek levando ~70s), o endpoint `/health` tentava fazer requisicao HTTP interna que demorava ou expirava em 12s, respondendo falsamente 503 `backend_down`. O monitor acreditava que o servico havia morrido e tentava mata-lo repetidamente a cada poucos minutos.
2. **Processo zumbi retendo a porta 6446**: o `taskkill /PID <pid> /T /F` expirava por timeout no Windows (ETIMEDOUT). Como o processo antigo continuava vivo segurando a porta 6446, qualquer tentativa de reinicio falhava com `EADDRINUSE: address already in use 0.0.0.0:6446`.

## Correcoes estruturais (v1.1.0)

1. **/health instantaneo e nao-bloqueante**: a saude do backend agora reflete diretamente o estado do processo filho `ocChild` gerenciado pelo `server.mjs`. O `/health` responde em ~20ms, sem requisicoes HTTP internas que possam bloquear durante inferencias longas.
2. **Liberacao garantida da porta 6446**: antes de qualquer spawn, o `watchdog.cjs` verifica nativamente se a porta 6446 esta ocupada, identifica o PID via `netstat` e executa terminacao direta do processo (`process.kill('SIGKILL')` a nivel de kernel do Windows), aguardando a liberacao total antes de subir o novo processo.
3. **Trava de instancia unica na porta 6445**: o monitor garante que apenas uma instancia de monitoramento execute por vez via socket loopback. Se uma nova tarefa agendada disparar, ela detecta a porta 6445 e encerra imediatamente.
4. **Execucao 100% headless assincrona**: o iniciador `watchdog-node.vbs` dispara o monitor com `bWaitOnReturn = False`, garantindo que o Agendador de Tarefas do Windows complete sem travar processos em espera.

## Validacao em 08/11/2026
- Chamada real de modelo longo (DeepSeek V4.1 Flash, 73.3s de latencia) completada com HTTP 200 sem disparar falsos positivos de saude.
- Latencia de resposta do /health: ~20-50ms.
- Janelas visiveis ativas do OC-Free: 0.
- Reinicio e liberacao de porta validados via netstat e recuperacao automatica.
