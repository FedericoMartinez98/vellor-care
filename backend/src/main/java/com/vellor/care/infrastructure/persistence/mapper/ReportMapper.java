package com.vellor.care.infrastructure.persistence.mapper;

import com.vellor.care.domain.model.ReportDefinition;
import com.vellor.care.infrastructure.persistence.entity.ReportEntity;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class ReportMapper {

    public ReportDefinition toDomain(ReportEntity entity) {
        if (entity == null) return null;
        return new ReportDefinition(
            entity.getId(),
            entity.getName(),
            entity.getReportKey(),
            entity.getDescription(),
            entity.getFiltersJson(),
            entity.getOwnerId(),
            entity.isShared(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    public ReportEntity toEntity(ReportDefinition domain) {
        if (domain == null) return null;
        Instant now = Instant.now();
        return ReportEntity.builder()
            .id(domain.id())
            .name(domain.name())
            .reportKey(domain.reportKey())
            .description(domain.description())
            .filtersJson(domain.filtersJson())
            .ownerId(domain.ownerId())
            .shared(domain.shared())
            .createdAt(domain.createdAt() != null ? domain.createdAt() : now)
            .updatedAt(domain.updatedAt() != null ? domain.updatedAt() : now)
            .build();
    }
}
