package com.vellor.care.domain.model;

import java.time.Instant;
import java.util.UUID;

public record ReportDefinition(
    UUID id,
    String name,
    ReportKey reportKey,
    String description,
    String filtersJson,
    UUID ownerId,
    boolean shared,
    Instant createdAt,
    Instant updatedAt
) {}
