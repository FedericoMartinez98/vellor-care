package com.vellor.care.domain.model;

import java.math.BigDecimal;
import java.util.UUID;

public record MaintenancePartUsage(
    UUID id,
    UUID partId,
    String partName,
    int quantity,
    BigDecimal unitCost
) {}
