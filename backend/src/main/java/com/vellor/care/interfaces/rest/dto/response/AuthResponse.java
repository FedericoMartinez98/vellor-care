package com.vellor.care.interfaces.rest.dto.response;

import com.vellor.care.domain.model.UserRole;

import java.util.UUID;

public record AuthResponse(
    String token,
    String refreshToken,
    String tokenType,
    long expiresIn,
    UserDTO user
) {
    public record UserDTO(
        UUID id,
        String name,
        String email,
        UserRole role,
        UUID sectorId,
        String avatarUrl
    ) {}
}
