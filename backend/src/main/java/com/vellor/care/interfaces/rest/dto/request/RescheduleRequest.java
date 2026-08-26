package com.vellor.care.interfaces.rest.dto.request;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record RescheduleRequest(
    @NotNull(message = "Nova data de agendamento é obrigatória")
    LocalDate newScheduledFor
) {}
