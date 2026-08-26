package com.vellor.care.domain.model;

import java.time.Instant;
import java.util.UUID;

public record Sector(
    UUID id,
    String name,
    String code,
    UUID unitId,
    String unitName,
    String manager,
    String costCenter,
    String color,
    Instant createdAt,
    Instant updatedAt
) {}
