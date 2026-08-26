package com.vellor.care.infrastructure.persistence.mapper;

import com.vellor.care.domain.model.HealthSnapshot;
import com.vellor.care.infrastructure.persistence.entity.HealthSnapshotEntity;
import org.springframework.stereotype.Component;

@Component
public class HealthMapper {

    public HealthSnapshot toDomain(HealthSnapshotEntity entity) {
        if (entity == null) return null;
        return new HealthSnapshot(
            entity.getId(),
            entity.getComputerId(),
            entity.getCollectedAt(),
            entity.getSsdHealthPercent(),
            entity.getSsdPowerOnHours(),
            entity.getCpuTempC(),
            entity.getGpuTempC(),
            entity.getSsdTempC(),
            entity.getCpuUsagePercent(),
            entity.getRamUsagePercent(),
            entity.getDiskFreePercent(),
            entity.getDiskFreeGb(),
            entity.getUptimeHours(),
            entity.getLastBootAt(),
            entity.getSource()
        );
    }

    public HealthSnapshotEntity toEntity(HealthSnapshot domain) {
        if (domain == null) return null;
        return HealthSnapshotEntity.builder()
            .id(domain.id())
            .computerId(domain.computerId())
            .collectedAt(domain.collectedAt())
            .ssdHealthPercent(domain.ssdHealthPercent())
            .ssdPowerOnHours(domain.ssdPowerOnHours())
            .cpuTempC(domain.cpuTempC())
            .gpuTempC(domain.gpuTempC())
            .ssdTempC(domain.ssdTempC())
            .cpuUsagePercent(domain.cpuUsagePercent())
            .ramUsagePercent(domain.ramUsagePercent())
            .diskFreePercent(domain.diskFreePercent())
            .diskFreeGb(domain.diskFreeGb())
            .uptimeHours(domain.uptimeHours())
            .lastBootAt(domain.lastBootAt())
            .source(domain.source())
            .build();
    }
}
