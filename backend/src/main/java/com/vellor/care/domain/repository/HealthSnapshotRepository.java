package com.vellor.care.domain.repository;

import com.vellor.care.domain.model.HealthSnapshot;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HealthSnapshotRepository {
    Optional<HealthSnapshot> findLatestByComputerId(UUID computerId);
    List<HealthSnapshot> findHistoryByComputerId(UUID computerId, int limit);
    HealthSnapshot save(HealthSnapshot snapshot);
}
