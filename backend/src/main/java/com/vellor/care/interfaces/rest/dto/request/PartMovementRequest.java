package com.vellor.care.interfaces.rest.dto.request;

import com.vellor.care.domain.model.MovementType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record PartMovementRequest(
    @NotNull(message = "ID da peça é obrigatório")
    UUID partId,

    @NotNull(message = "Tipo de movimentação é obrigatório")
    MovementType type,

    @Min(value = 1, message = "Quantidade mínima de 1")
    int quantity,

    String reason
) {}
