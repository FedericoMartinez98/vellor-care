package com.vellor.care.domain.model;

import java.math.BigDecimal;
import java.util.UUID;

public record MaintenanceChecklistItem(
    UUID id,
    String itemKey,
    String label,
    ChecklistGroup group,
    boolean done,
    BigDecimal measuredValue,
    String note,
    int sortOrder
) {}
