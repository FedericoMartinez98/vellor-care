package com.vellor.care.interfaces.rest.dto.request;

import com.vellor.care.domain.model.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record UserCreateRequest(
    @NotBlank(message = "Nome é obrigatório")
    String name,

    @NotBlank(message = "E-mail é obrigatório")
    @Email(message = "E-mail inválido")
    String email,

    String password,

    @NotNull(message = "Perfil de acesso é obrigatório")
    UserRole role,

    UUID sectorId,
    String phone,
    boolean active
) {}
