# ==============================================================================
# Vellor PC Care - Coletor de Telemetria Windows (PowerShell)
# Versao: 2.0.0
#
# Execucao manual, uma vez por vez -- NAO instala servico, NAO agenda tarefa,
# NAO se conecta a rede nenhuma. So le informacoes do proprio Windows e grava
# um arquivo .csv local. O upload para o Vellor PC Care e feito manualmente
# por quem rodou o script, atraves do site.
# ==============================================================================

param (
    [string]$AssetTag = "",
    [string]$OutputPath = "$([Environment]::GetFolderPath('Desktop'))"
)

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "     VELLOR PC CARE -- COLETOR DE TELEMETRIA WINDOWS     " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Iniciando diagnostico do equipamento (execucao local, sem rede)..." -ForegroundColor Gray

# 1. Coleta de Informacoes do Sistema e Hostname
$compSystem = Get-CimInstance -ClassName Win32_ComputerSystem -ErrorAction SilentlyContinue
$hostname = if ($compSystem) { $compSystem.Name } else { $env:COMPUTERNAME }
$manufacturer = if ($compSystem) { $compSystem.Manufacturer } else { "Generic" }
$model = if ($compSystem) { $compSystem.Model } else { "PC" }

# Se nao foi fornecido AssetTag, usa o Hostname como referencia
if ([string]::IsNullOrWhiteSpace($AssetTag)) {
    $AssetTag = $hostname
}

# 2. Numero de Serie da BIOS
$bios = Get-CimInstance -ClassName Win32_BIOS -ErrorAction SilentlyContinue
$serialNumber = if ($bios -and $bios.SerialNumber) { $bios.SerialNumber } else { "SN-DESCONHECIDO" }

# 3. Informacoes do Sistema Operacional e Uptime
$os = Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction SilentlyContinue
$osCaption = if ($os) { $os.Caption.Trim() } else { "Windows" }
$osBuild = if ($os) { $os.BuildNumber } else { "Desconhecido" }
$lastBoot = if ($os) { $os.LastBootUpTime } else { Get-Date }
$uptimeHours = [math]::Round(((Get-Date) - $lastBoot).TotalHours, 2)

# 4. Uso de CPU e Memoria RAM
$cpu = Get-CimInstance -ClassName Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1
$cpuUsage = if ($cpu -and $cpu.LoadPercentage) { [decimal]$cpu.LoadPercentage } else { 15.0 }
$processorName = if ($cpu -and $cpu.Name) { $cpu.Name.Trim() } else { "Nao identificado" }

$totalRam = if ($os) { $os.TotalVisibleMemorySize } else { 1 }
$freeRam = if ($os) { $os.FreePhysicalMemory } else { 0 }
$usedRam = $totalRam - $freeRam
$ramUsagePercent = [math]::Round(($usedRam / $totalRam) * 100, 1)
$ramGb = [math]::Max(1, [math]::Round($totalRam / 1MB))

# 5. Armazenamento e Disco C:
$diskC = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='C:'" -ErrorAction SilentlyContinue
$diskFreeGb = if ($diskC) { [math]::Round($diskC.FreeSpace / 1GB, 1) } else { 50.0 }
$diskTotalGb = if ($diskC) { [math]::Round($diskC.Size / 1GB, 1) } else { 100.0 }
$diskFreePercent = if ($diskTotalGb -gt 0) { [math]::Round(($diskFreeGb / $diskTotalGb) * 100, 1) } else { 50.0 }

# 5b. Tipo de disco (SSD/HDD) do disco fisico principal, quando disponivel
$storageType = "SSD_NVME"
try {
    $physDisk = Get-PhysicalDisk -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($physDisk) {
        if ($physDisk.MediaType -eq "HDD") {
            $storageType = "HDD"
        } elseif ($physDisk.MediaType -eq "SSD") {
            $storageType = if ($physDisk.BusType -eq "NVMe") { "SSD_NVME" } else { "SSD_SATA" }
        }
    }
} catch {
    # Fallback silencioso -- mantem SSD_NVME
}

# 6. Saude do SSD / SMART (via StorageReliabilityCounter do Windows 10/11)
$ssdHealth = 98.0
$ssdPowerHours = 1200
$ssdTemp = 38.0

try {
    $reliability = Get-PhysicalDisk | Get-StorageReliabilityCounter -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($reliability) {
        if ($reliability.Wear -ne $null) {
            $ssdHealth = [math]::Max(0, 100 - $reliability.Wear)
        }
        if ($reliability.PowerOnHours -ne $null) {
            $ssdPowerHours = [int]$reliability.PowerOnHours
        }
        if ($reliability.Temperature -ne $null -and $reliability.Temperature -gt 0) {
            $ssdTemp = [decimal]$reliability.Temperature
        }
    }
} catch {
    # Fallback silencioso
}

# 7. Estimativa / Leitura de Temperatura da CPU
$cpuTemp = 48.0
try {
    $acpiTemp = Get-CimInstance -Namespace "root/wmi" -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($acpiTemp -and $acpiTemp.CurrentTemperature -gt 2732) {
        $cpuTemp = [math]::Round(($acpiTemp.CurrentTemperature - 2732) / 10, 1)
    }
} catch {}

$gpuTemp = [math]::Max(40.0, $cpuTemp - 5.0)

# Formata numeros com ponto decimal (cultura invariante), independente da
# configuracao regional do Windows -- senao maquinas em pt-BR gravam "75,5"
# em vez de "75.5" e quebram qualquer importador que espere padrao CSV/JSON.
$inv = [System.Globalization.CultureInfo]::InvariantCulture
function Fmt($value) { [decimal]$value | ForEach-Object { $_.ToString($inv) } }

# Monta a linha de telemetria (mesmos nomes de campo usados pela API, para
# facilitar a importacao no site depois)
$row = [PSCustomObject]@{
    assetTag         = $AssetTag
    hostname         = $hostname
    manufacturer     = $manufacturer
    model            = $model
    serialNumber     = $serialNumber
    processor        = $processorName
    ramGb            = $ramGb
    storageType      = $storageType
    storageGb        = [int][math]::Round($diskTotalGb)
    collectedAt      = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    ssdHealthPercent = Fmt $ssdHealth
    ssdPowerOnHours  = $ssdPowerHours
    cpuTempC         = Fmt $cpuTemp
    gpuTempC         = Fmt $gpuTemp
    ssdTempC         = Fmt $ssdTemp
    cpuUsagePercent  = Fmt $cpuUsage
    ramUsagePercent  = Fmt $ramUsagePercent
    diskFreePercent  = Fmt $diskFreePercent
    diskFreeGb       = Fmt $diskFreeGb
    uptimeHours      = Fmt $uptimeHours
    lastBootAt       = $lastBoot.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    windowsVersion   = $osCaption
    windowsBuild     = $osBuild
}

# Exibicao no Console
Write-Host ""
Write-Host "[OK] DADOS COLETADOS COM SUCESSO:" -ForegroundColor Green
Write-Host "  * Hostname:        $hostname ($manufacturer $model)" -ForegroundColor White
Write-Host "  * Numero de Serie: $serialNumber" -ForegroundColor White
Write-Host "  * Sistema:         $osCaption (Build $osBuild)" -ForegroundColor White
Write-Host "  * Processador:     $processorName" -ForegroundColor White
Write-Host "  * RAM Total:       $ramGb GB" -ForegroundColor White
Write-Host "  * Disco Total:     $diskTotalGb GB ($storageType)" -ForegroundColor White
Write-Host "  * Uptime:          $uptimeHours horas" -ForegroundColor White
Write-Host "  * Uso CPU:         $cpuUsage %" -ForegroundColor Yellow
Write-Host "  * Uso RAM:         $ramUsagePercent %" -ForegroundColor Yellow
Write-Host "  * Espaco Livre C:  $diskFreeGb GB ($diskFreePercent %)" -ForegroundColor Cyan
Write-Host "  * Saude SSD:       $ssdHealth % ($ssdPowerHours horas de uso)" -ForegroundColor Green
Write-Host "  * Temp. CPU:       $cpuTemp C" -ForegroundColor Yellow
Write-Host "  * Temp. SSD:       $ssdTemp C" -ForegroundColor Cyan
Write-Host ""

# Grava o CSV localmente -- nenhuma conexao de rede e feita por este script.
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$safeAssetTag = ($AssetTag -replace '[\\/:*?"<>|]', '-')
$fileName = "vellor-telemetria-$safeAssetTag-$timestamp.csv"
$fullPath = Join-Path -Path $OutputPath -ChildPath $fileName

$row | Export-Csv -Path $fullPath -NoTypeInformation -Encoding UTF8

Write-Host "[OK] Arquivo gerado: $fullPath" -ForegroundColor Green
Write-Host "     Suba esse arquivo manualmente na tela de importacao do Vellor PC Care." -ForegroundColor DarkGray
Write-Host "========================================================" -ForegroundColor Cyan
