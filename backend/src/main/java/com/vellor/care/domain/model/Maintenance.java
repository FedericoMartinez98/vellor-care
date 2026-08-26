package com.vellor.care.domain.model;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record Maintenance(
    UUID id,
    UUID computerId,
    String assetTag,
    String hostname,
    UUID sectorId,
    UUID technicianId,
    String technicianName,
    MaintenanceType type,
    MaintenanceStatus status,
    Priority priority,
    LocalDate scheduledFor,
    Instant startedAt,
    Instant finishedAt,
    Integer durationMinutes,
    List<MaintenanceChecklistItem> checklist,
    List<MaintenancePartUsage> parts,
    List<MaintenancePhoto> photos,
    String notes,
    String signatureDataUrl,
    Instant createdAt,
    Instant updatedAt
) {}
