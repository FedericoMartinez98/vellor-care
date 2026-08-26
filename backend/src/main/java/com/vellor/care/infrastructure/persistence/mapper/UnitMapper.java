package com.vellor.care.infrastructure.persistence.mapper;

import com.vellor.care.domain.model.Unit;
import com.vellor.care.infrastructure.persistence.entity.UnitEntity;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class UnitMapper {

    public Unit toDomain(UnitEntity entity) {
        if (entity == null) return null;
        return new Unit(
            entity.getId(),
            entity.getName(),
            entity.getCode(),
            entity.getAddress(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    public UnitEntity toEntity(Unit domain) {
        if (domain == null) return null;
        Instant now = Instant.now();
        return UnitEntity.builder()
            .id(domain.id())
            .name(domain.name())
            .code(domain.code())
            .address(domain.address())
            .createdAt(domain.createdAt() != null ? domain.createdAt() : now)
            .updatedAt(domain.updatedAt() != null ? domain.updatedAt() : now)
            .build();
    }
}
