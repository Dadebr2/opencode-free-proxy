# OC-Free 1.2.0 — recuperacao apos reinicio

Esta versao corrige falhas observadas com OpenCode v2.3.0 e evita processos OC-Free acumulados.

## Mudancas

- O servidor aguarda ate 120 segundos para o `opencode serve` iniciar e ate 180 segundos para a lista de modelos ficar pronta, incluindo a ativacao de plugins.
- O PID do servidor e gravado logo no inicio, para que o monitor consiga encontra-lo mesmo se o inicio do backend falhar.
- Um teste de atividade em segundo plano acompanha o backend sem atrasar `/health`; chamadas longas dos modelos nao devem ser confundidas com queda.
- O watchdog encerra processos OC-Free orfaos, espera a porta 6446 ficar livre e so entao inicia outro servidor. A porta 6445 impede dois watchdogs simultaneos.

## Validacao registrada em 14/11/2026

- `opencode serve` v2.3.0 iniciou em aproximadamente 5,5 segundos em teste isolado.
- A API do OpenCode respondeu 503 durante a ativacao de plugins e 200 cerca de 12 segundos depois; o tratamento permite aguardar ate 180 segundos.
- O proxy listou 12 modelos free.
- Uma chamada a `ocx provider test ocfree-local --model mimo-v2.6-flash-free --yes` conectou com sucesso.
- Uma conversa por `combo/Combo-OC-Free` respondeu `OK`.

## Instalar

Execute `node scripts/install-free-proxy.cjs`. O instalador inclui os arquivos de recuperacao e registra a tarefa headless do Windows. Apos instalar, valide com `node scripts/check-free-proxy.cjs` e uma chamada real a um modelo.

## Limitacoes

O watchdog nao corrige indisponibilidade do modelo no servico externo. Durante a inicializacao, os modelos podem levar alguns segundos para aparecer.
