package com.vellor.care.domain.model;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record User(
    UUID id,
    String name,
    String email,
    String passwordHash,
    UserRole role,
    UUID sectorId,
    String sectorName,
    String avatarUrl,
    String phone,
    boolean active,
    String adObjectGuid,
    String adUpn,
    Instant lastLoginAt,
    List<UserPermission> permissions,
    Instant createdAt,
    Instant updatedAt
) {}
