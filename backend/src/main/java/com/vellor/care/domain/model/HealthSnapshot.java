package com.vellor.care.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record HealthSnapshot(
    UUID id,
    UUID computerId,
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
    HealthSource source
) {}
