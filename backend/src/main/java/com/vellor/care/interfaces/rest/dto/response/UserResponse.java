package com.vellor.care.interfaces.rest.dto.response;

import com.vellor.care.domain.model.User;
import com.vellor.care.domain.model.UserRole;

import java.time.Instant;
import java.util.UUID;

/**
 * Usuario exposto pela API. Existe para NAO serializar o registro de dominio
 * inteiro -- que carrega `passwordHash` (BCrypt) e vazaria o hash de todos os
 * usuarios para qualquer sessao autenticada.
 */
public record UserResponse(
    UUID id,
    String name,
    String email,
    UserRole role,
    UUID sectorId,
    String sectorName,
    String avatarUrl,
    String phone,
    boolean active,
    Instant lastLoginAt,
    Instant createdAt,
    Instant updatedAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
            user.id(),
            user.name(),
            user.email(),
            user.role(),
            user.sectorId(),
            user.sectorName(),
            user.avatarUrl(),
            user.phone(),
            user.active(),
            user.lastLoginAt(),
            user.createdAt(),
            user.updatedAt()
        );
    }
}
