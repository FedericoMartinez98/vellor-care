package com.vellor.care.domain.model;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record Computer(
    UUID id,
    String assetTag,
    String hostname,
    String serialNumber,
    String model,
    String manufacturer,
    ComputerAssignment assignment,
    ComputerHardware hardware,
    ComputerSystem system,
    ComputerWarranty warranty,
    ComputerStatus status,
    String notes,
    String photoUrl,
    String qrPayload,
    Instant lastMaintenanceAt,
    LocalDate nextMaintenanceAt,
    int maintenanceIntervalDays,
    HealthSnapshot latestHealth,
    Instant createdAt,
    Instant updatedAt
) {}
