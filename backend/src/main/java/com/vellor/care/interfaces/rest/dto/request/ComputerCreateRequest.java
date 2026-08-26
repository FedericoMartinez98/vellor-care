package com.vellor.care.interfaces.rest.dto.request;

import com.vellor.care.domain.model.ComputerAssignment;
import com.vellor.care.domain.model.ComputerHardware;
import com.vellor.care.domain.model.ComputerStatus;
import com.vellor.care.domain.model.ComputerSystem;
import com.vellor.care.domain.model.ComputerWarranty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record ComputerCreateRequest(
    @NotBlank(message = "Patrimônio é obrigatório")
    String assetTag,

    @NotBlank(message = "Hostname é obrigatório")
    String hostname,

    @NotBlank(message = "Número de série é obrigatório")
    String serialNumber,

    @NotBlank(message = "Modelo é obrigatório")
    String model,

    @NotBlank(message = "Fabricante é obrigatório")
    String manufacturer,

    @NotNull(message = "Dados de atribuição são obrigatórios")
    @Valid
    ComputerAssignment assignment,

    @NotNull(message = "Dados de hardware são obrigatórios")
    @Valid
    ComputerHardware hardware,

    @NotNull(message = "Dados de sistema são obrigatórios")
    @Valid
    ComputerSystem system,

    @Valid
    ComputerWarranty warranty,

    ComputerStatus status,
    String notes,
    String photoUrl,
    String qrPayload,
    LocalDate nextMaintenanceAt,
    int maintenanceIntervalDays
) {}
