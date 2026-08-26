package com.vellor.care.infrastructure.persistence.mapper;

import com.vellor.care.domain.model.AppNotification;
import com.vellor.care.infrastructure.persistence.entity.NotificationEntity;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class NotificationMapper {

    public AppNotification toDomain(NotificationEntity entity) {
        if (entity == null) return null;
        return new AppNotification(
            entity.getId(),
            entity.getType(),
            entity.getSeverity(),
            entity.getTitle(),
            entity.getMessage(),
            entity.getComputerId(),
            entity.getMaintenanceId(),
            entity.getPartId(),
            entity.getTargetUserId(),
            entity.getHref(),
            entity.isRead(),
            entity.getDedupKey(),
            entity.getCreatedAt()
        );
    }

    public NotificationEntity toEntity(AppNotification domain) {
        if (domain == null) return null;
        return NotificationEntity.builder()
            .id(domain.id())
            .type(domain.type())
            .severity(domain.severity())
            .title(domain.title())
            .message(domain.message())
            .computerId(domain.computerId())
            .maintenanceId(domain.maintenanceId())
            .partId(domain.partId())
            .targetUserId(domain.targetUserId())
            .href(domain.href())
            .read(domain.read())
            .dedupKey(domain.dedupKey())
            .createdAt(domain.createdAt() != null ? domain.createdAt() : Instant.now())
            .build();
    }
}
