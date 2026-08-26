package com.vellor.care.infrastructure.persistence.mapper;

import com.vellor.care.domain.model.User;
import com.vellor.care.domain.model.UserPermission;
import com.vellor.care.infrastructure.persistence.entity.UserEntity;
import com.vellor.care.infrastructure.persistence.entity.UserPermissionEntity;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class UserMapper {

    public User toDomain(UserEntity entity) {
        if (entity == null) return null;
        String sectorName = entity.getSector() != null ? entity.getSector().getName() : null;
        List<UserPermission> perms = entity.getPermissions() != null
            ? entity.getPermissions().stream()
                .map(p -> new UserPermission(p.getId(), p.getUserId(), p.getModule(), p.isCanRead(), p.isCanWrite(), p.isCanRemove()))
                .toList()
            : Collections.emptyList();

        return new User(
            entity.getId(),
            entity.getName(),
            entity.getEmail(),
            entity.getPasswordHash(),
            entity.getRole(),
            entity.getSectorId(),
            sectorName,
            entity.getAvatarUrl(),
            entity.getPhone(),
            entity.isActive(),
            entity.getAdObjectGuid(),
            entity.getAdUpn(),
            entity.getLastLoginAt(),
            perms,
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    public UserEntity toEntity(User domain) {
        if (domain == null) return null;
        Instant now = Instant.now();
        UserEntity entity = UserEntity.builder()
            .id(domain.id())
            .name(domain.name())
            .email(domain.email())
            .passwordHash(domain.passwordHash())
            .role(domain.role())
            .sectorId(domain.sectorId())
            .avatarUrl(domain.avatarUrl())
            .phone(domain.phone())
            .active(domain.active())
            .adObjectGuid(domain.adObjectGuid())
            .adUpn(domain.adUpn())
            .lastLoginAt(domain.lastLoginAt())
            .createdAt(domain.createdAt() != null ? domain.createdAt() : now)
            .updatedAt(domain.updatedAt() != null ? domain.updatedAt() : now)
            .build();

        if (domain.permissions() != null) {
            List<UserPermissionEntity> permEntities = domain.permissions().stream()
                .map(p -> UserPermissionEntity.builder()
                    .id(p.id())
                    .userId(domain.id())
                    .user(entity)
                    .module(p.module())
                    .canRead(p.canRead())
                    .canWrite(p.canWrite())
                    .canRemove(p.canRemove())
                    .build())
                .toList();
            entity.setPermissions(new ArrayList<>(permEntities));
        }

        return entity;
    }
}
