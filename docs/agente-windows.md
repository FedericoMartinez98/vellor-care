# Agente Windows — arquitetura preparada

Este documento descreve o contrato já previsto no Vellor Care para receber telemetria
automática de um agente instalado nas estações Windows. **O agente ainda não faz parte
deste repositório** — o que existe hoje é toda a estrutura do lado do servidor para
recebê-lo sem refatoração.

## 1. Por que o sistema já está preparado

Três decisões de projeto tornam a adição do agente uma questão de escrever o cliente:

| Decisão | Onde | Efeito |
| --- | --- | --- |
| Telemetria é uma entidade separada, versionada por coleta | `computer_health_snapshots` | O histórico de saúde nasce pronto; nada muda no cadastro do computador |
| Campo `source` (`MANUAL` \| `AGENTE`) em cada coleta | `computer_health_snapshots.source` | A UI distingue dado digitado pelo técnico de dado coletado, e nenhum sobrescreve o outro |
| Autenticação de máquina separada da de usuário | `vellor.agent.ingest-api-key` | O agente não precisa de conta de usuário nem de JWT com refresh |

O painel **Saúde do Computador** já lê sempre o snapshot mais recente
(`idx_health_computer_collected`), então no dia em que o agente começar a postar, os
indicadores passam a se atualizar sozinhos sem nenhuma alteração de front-end.

## 2. Endpoint de ingestão

```
POST /api/v1/agent/telemetry
X-Vellor-Agent-Key: <chave configurada em vellor.agent.ingest-api-key>
Content-Type: application/json
```

O agente se identifica pelo par `hostname` + `serialNumber`. O servidor resolve o
computador por `serial_number` (chave estável mesmo se a máquina for renomeada) e cai
para `hostname` como alternativa.

### Corpo da requisição

```jsonc
{
  "hostname": "ADM-NB-014",
  "serialNumber": "5CG1234ABC",
  "collectedAt": "2026-08-25T11:42:07Z",

  "health": {
    "ssdHealthPercent": 94.0,      // SMART: 100 - "Percentage Used" (NVMe) ou atributo 0xE7
    "ssdPowerOnHours": 8214,
    "cpuTempC": 61.5,
    "gpuTempC": 48.0,              // opcional
    "ssdTempC": 44.0,
    "cpuUsagePercent": 18.4,
    "ramUsagePercent": 63.2,
    "diskFreePercent": 41.8,
    "diskFreeGb": 214.3,
    "uptimeHours": 52.5,
    "lastBootAt": "2026-08-23T07:12:00Z"
  },

  // Opcional: quando presente, atualiza o inventário da máquina.
  "inventory": {
    "processor": "Intel Core i5-1235U",
    "ramGb": 16,
    "storageType": "SSD_NVME",
    "storageGb": 512,
    "gpu": "Intel Iris Xe",
    "windowsVersion": "Windows 11 Pro",
    "windowsBuild": "26100.2033",
    "officeVersion": "Microsoft 365 Apps",
    "antivirus": "Microsoft Defender",
    "lastWindowsUpdate": "2026-08-19",
    "domainJoined": true
  }
}
```

### Respostas

| Código | Situação |
| --- | --- |
| `202 Accepted` | Telemetria aceita. Corpo: `{ "computerId": "...", "snapshotId": "...", "alertsRaised": 2 }` |
| `401 Unauthorized` | `X-Vellor-Agent-Key` ausente ou incorreta |
| `404 Not Found` | Nenhum computador com aquele `serialNumber`/`hostname` |
| `422 Unprocessable Entity` | Payload fora das faixas válidas (ex.: `ssdHealthPercent` > 100) |

Ingestão é **idempotente por janela**: duas coletas do mesmo agente com `collectedAt`
dentro de 60 segundos gravam apenas a primeira, para tolerar retry de rede.

## 3. O que acontece no servidor a cada coleta

1. Grava uma linha em `computer_health_snapshots` com `source = 'AGENTE'`.
2. Se `inventory` veio no payload, atualiza os campos de hardware/sistema em `computers`
   — **sem** tocar em patrimônio, responsável, setor ou status, que são dados de gestão
   e não de máquina.
3. Roda as regras de alerta e insere em `notifications` o que estiver fora da faixa:
   - `SSD_SAUDE_BAIXA` — `ssdHealthPercent < 20`
   - `TEMPERATURA_ALTA` — `cpuTempC > 85` ou `ssdTempC > 85`
   - `SEM_MANUTENCAO_120_DIAS` — última manutenção há mais de 120 dias

   A coluna `notifications.dedup_key` impede que a mesma condição gere alerta repetido
   a cada coleta — o formato é `TIPO:computerId:YYYY-MM-DD`, ou seja, no máximo um
   alerta por condição, por máquina, por dia.

## 4. Origem dos dados no Windows

O agente não precisa de bibliotecas exóticas; tudo sai de APIs nativas:

| Métrica | Fonte |
| --- | --- |
| SMART / saúde do SSD | `MSFT_PhysicalDisk` e `MSFT_StorageReliabilityCounter` (namespace `root\Microsoft\Windows\Storage`) |
| Temperatura CPU | `MSAcpi_ThermalZoneTemperature` (WMI) ou LibreHardwareMonitorLib para leitura por núcleo |
| Temperatura SSD | `MSFT_StorageReliabilityCounter.Temperature` |
| Uso de CPU / RAM | Contadores de desempenho (`PerformanceCounter`) ou `Get-CimInstance Win32_OperatingSystem` |
| Espaço livre | `Win32_LogicalDisk` |
| Uptime / último boot | `Win32_OperatingSystem.LastBootUpTime` |
| Inventário | `Win32_Processor`, `Win32_PhysicalMemory`, `Win32_VideoController`, `Win32_OperatingSystem`, registro do Office |

> Leitura de temperatura via `MSAcpi_ThermalZoneTemperature` exige privilégio
> administrativo e não é implementada por todos os fabricantes. Rodar o agente como
> serviço do Windows (conta `LocalSystem`) resolve o privilégio; para as máquinas cujo
> firmware não expõe a zona térmica, o campo deve ser omitido do payload em vez de
> enviado como `0` — o servidor trata ausência e zero de formas diferentes.

## 5. Forma de distribuição sugerida

- **Linguagem**: C# / .NET 8 publicado como *single-file self-contained* — não exige
  runtime instalado na estação.
- **Execução**: serviço do Windows (`sc.exe create VellorAgent`), coleta a cada 60 min
  com jitter aleatório de ±5 min para não concentrar carga no servidor.
- **Configuração**: `appsettings.json` ao lado do executável, com `ApiBaseUrl` e
  `AgentKey`; distribuível por GPO ou Intune.
- **Resiliência**: fila em disco (`%ProgramData%\VellorAgent\queue`) para coletas feitas
  offline, drenada na próxima execução com sucesso.

## 6. Endurecimento antes de ir para produção

A chave estática de ingestão é adequada para rede interna, mas em um piloto amplo vale:

1. Emitir uma chave **por máquina** no momento do cadastro (coluna nova em `computers`),
   permitindo revogar uma estação comprometida sem girar a chave de todas.
2. Aceitar ingestão apenas de faixas de IP da rede corporativa.
3. Servir a API sobre TLS — a chave trafega em header e não deve ir em texto claro.

Nenhum desses itens muda o contrato acima; são camadas em volta dele.
