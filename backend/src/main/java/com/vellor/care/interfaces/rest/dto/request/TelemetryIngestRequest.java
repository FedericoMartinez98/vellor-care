package com.vellor.care.interfaces.rest.dto.request;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.time.Instant;

public record TelemetryIngestRequest(
    @NotBlank(message = "Patrimônio ou Hostname é obrigatório")
    String assetTag,

    String hostname,
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
) {}
