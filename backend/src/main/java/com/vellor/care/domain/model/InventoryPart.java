package com.vellor.care.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record InventoryPart(
    UUID id,
    String sku,
    String name,
    PartCategory category,
    int quantity,
    int minimumQuantity,
    String unit,
    String supplier,
    BigDecimal unitValue,
    String location,
    String notes,
    Instant createdAt,
    Instant updatedAt
) {}
