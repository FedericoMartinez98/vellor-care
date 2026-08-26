package com.vellor.care.application.telemetry;

import com.vellor.care.domain.model.StorageType;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Uma linha do CSV gerado pelo coletor Windows (`agent/vellor-agent.ps1`).
 * Contem tanto os dados de telemetria (para {@link IngestTelemetryUseCase})
 * quanto os dados de hardware que só são usados quando o computador ainda
 * não existe e precisa ser cadastrado automaticamente.
 */
public record TelemetryImportRow(
    String assetTag,
    String hostname,
    String manufacturer,
    String model,
    String serialNumber,
    String processor,
    Integer ramGb,
    StorageType storageType,
    Integer storageGb,
    Instant collectedAt,
    BigDecimal ssdHealthPercent,
    Integer ssdPowerOnHours,
    BigDecimal cpuTempC,
    BigDecimal gpuTempC,
    BigDecimal ssdTempC,
    BigDecimal cpuUsagePercent,
    BigDecimal ramUsagePercent,
    BigDecimal diskFreePercent,
    BigDecimal diskFreeGb,
    BigDecimal uptimeHours,
    Instant lastBootAt,
    String windowsVersion,
    String windowsBuild
) {
    public IngestTelemetryUseCase.TelemetryIngestCommand toIngestCommand() {
        return new IngestTelemetryUseCase.TelemetryIngestCommand(
            assetTag,
            hostname,
            collectedAt,
            ssdHealthPercent,
            ssdPowerOnHours,
            cpuTempC,
            gpuTempC,
            ssdTempC,
            cpuUsagePercent,
            ramUsagePercent,
            diskFreePercent,
            diskFreeGb,
            uptimeHours,
            lastBootAt,
            windowsVersion,
            windowsBuild
        );
    }
}
