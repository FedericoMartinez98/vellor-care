package com.vellor.care.infrastructure.persistence.adapter;

import com.vellor.care.domain.model.HealthSnapshot;
import com.vellor.care.domain.repository.HealthSnapshotRepository;
import com.vellor.care.infrastructure.persistence.entity.HealthSnapshotEntity;
import com.vellor.care.infrastructure.persistence.mapper.HealthMapper;
import com.vellor.care.infrastructure.persistence.springdata.JpaHealthRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class HealthSnapshotRepositoryAdapter implements HealthSnapshotRepository {

    private final JpaHealthRepository jpaHealthRepository;
    private final HealthMapper healthMapper;

    @Override
    public Optional<HealthSnapshot> findLatestByComputerId(UUID computerId) {
        return jpaHealthRepository.findLatestByComputerId(computerId)
            .map(healthMapper::toDomain);
    }

    @Override
    public List<HealthSnapshot> findHistoryByComputerId(UUID computerId, int limit) {
        return jpaHealthRepository.findHistoryByComputerId(computerId, PageRequest.of(0, limit)).stream()
            .map(healthMapper::toDomain)
            .toList();
    }

    @Override
    public HealthSnapshot save(HealthSnapshot snapshot) {
        HealthSnapshotEntity entity = healthMapper.toEntity(snapshot);
        HealthSnapshotEntity saved = jpaHealthRepository.save(entity);
        return healthMapper.toDomain(saved);
    }
}
