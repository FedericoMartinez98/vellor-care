package com.vellor.care.interfaces.rest.dto.request;

import com.vellor.care.domain.model.PartCategory;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record PartCreateRequest(
    @NotBlank(message = "SKU é obrigatório")
    String sku,

    @NotBlank(message = "Nome é obrigatório")
    String name,

    PartCategory category,

    @Min(value = 0, message = "Quantidade não pode ser negativa")
    int quantity,

    @Min(value = 0, message = "Quantidade mínima não pode ser negativa")
    int minimumQuantity,

    String unit,
    String supplier,
    BigDecimal unitValue,
    String location,
    String notes
) {}
