package com.vellor.care.domain.model;

import java.time.Instant;
import java.util.UUID;

public record InventoryMovement(
    UUID id,
    UUID partId,
    String partName,
    MovementType type,
    int quantity,
    int balanceAfter,
    UUID maintenanceId,
    String computerAssetTag,
    UUID userId,
    String userName,
    String reason,
    Instant createdAt
) {}
