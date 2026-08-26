package com.vellor.care.domain.model;

import java.time.Instant;
import java.util.UUID;

public record AppNotification(
    UUID id,
    NotificationType type,
    Severity severity,
    String title,
    String message,
    UUID computerId,
    UUID maintenanceId,
    UUID partId,
    UUID targetUserId,
    String href,
    boolean read,
    String dedupKey,
    Instant createdAt
) {}
