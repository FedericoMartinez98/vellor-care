package com.vellor.care.domain.model;

import java.time.Instant;
import java.util.UUID;

public record MaintenancePhoto(
    UUID id,
    String url,
    String caption,
    PhotoMoment moment,
    Instant createdAt
) {}
