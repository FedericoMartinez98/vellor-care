package com.vellor.care.domain.model;

import java.time.Instant;
import java.util.UUID;

public record Unit(
    UUID id,
    String name,
    String code,
    String address,
    Instant createdAt,
    Instant updatedAt
) {}
