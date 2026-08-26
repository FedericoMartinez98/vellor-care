package com.vellor.care.infrastructure.persistence.mapper;

import com.vellor.care.domain.model.Sector;
import com.vellor.care.infrastructure.persistence.entity.SectorEntity;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class SectorMapper {

    public Sector toDomain(SectorEntity entity) {
        if (entity == null) return null;
        String unitName = entity.getUnit() != null ? entity.getUnit().getName() : null;
        return new Sector(
            entity.getId(),
            entity.getName(),
            entity.getCode(),
            entity.getUnitId(),
            unitName,
            entity.getManager(),
            entity.getCostCenter(),
            entity.getColor(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    public SectorEntity toEntity(Sector domain) {
        if (domain == null) return null;
        Instant now = Instant.now();
        return SectorEntity.builder()
            .id(domain.id())
            .name(domain.name())
            .code(domain.code())
            .unitId(domain.unitId())
            .manager(domain.manager())
            .costCenter(domain.costCenter())
            .color(domain.color())
            .createdAt(domain.createdAt() != null ? domain.createdAt() : now)
            .updatedAt(domain.updatedAt() != null ? domain.updatedAt() : now)
            .build();
    }
}
