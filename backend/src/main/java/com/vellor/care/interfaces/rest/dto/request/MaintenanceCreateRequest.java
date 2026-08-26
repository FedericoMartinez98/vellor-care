package com.vellor.care.interfaces.rest.dto.request;

import com.vellor.care.domain.model.MaintenanceType;
import com.vellor.care.domain.model.Priority;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record MaintenanceCreateRequest(
    @NotNull(message = "ID do computador é obrigatório")
    UUID computerId,

    @NotNull(message = "ID do técnico é obrigatório")
    UUID technicianId,

    MaintenanceType type,
    Priority priority,
    LocalDate scheduledFor,
    String notes
) {}
