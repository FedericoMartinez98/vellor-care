package com.vellor.care.interfaces.rest.dto.request;

import com.vellor.care.application.maintenance.CompleteMaintenanceUseCase.ChecklistItemInput;
import com.vellor.care.application.maintenance.CompleteMaintenanceUseCase.PartUsageInput;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record CompleteMaintenanceRequest(
    List<ChecklistItemInput> checklist,
    List<PartUsageInput> parts,
    List<String> photosBefore,
    List<String> photosAfter,

    @Min(value = 1, message = "Duração mínima de 1 minuto")
    int durationMinutes,

    String notes,

    @NotBlank(message = "Assinatura do técnico é obrigatória")
    String signatureDataUrl
) {}
