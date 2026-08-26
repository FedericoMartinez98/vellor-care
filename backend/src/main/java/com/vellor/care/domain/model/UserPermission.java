package com.vellor.care.domain.model;

import java.util.UUID;

public record UserPermission(
    UUID id,
    UUID userId,
    String module,
    boolean canRead,
    boolean canWrite,
    boolean canRemove
) {}
