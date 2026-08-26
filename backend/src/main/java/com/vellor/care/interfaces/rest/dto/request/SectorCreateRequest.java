package com.vellor.care.interfaces.rest.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record SectorCreateRequest(
    @NotBlank(message = "Nome do setor é obrigatório")
    String name,

    @NotBlank(message = "Código é obrigatório")
    String code,

    @NotNull(message = "ID da unidade é obrigatório")
    UUID unitId,

    String manager,
    String costCenter,
    String color
) {}
