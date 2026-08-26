package com.vellor.care.infrastructure.persistence.springdata;

import com.vellor.care.infrastructure.persistence.entity.HealthSnapshotEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JpaHealthRepository extends JpaRepository<HealthSnapshotEntity, UUID> {

    @Query("SELECT h FROM HealthSnapshotEntity h WHERE h.computerId = :computerId ORDER BY h.collectedAt DESC LIMIT 1")
    Optional<HealthSnapshotEntity> findLatestByComputerId(@Param("computerId") UUID computerId);

    @Query("SELECT h FROM HealthSnapshotEntity h WHERE h.computerId = :computerId ORDER BY h.collectedAt DESC")
    List<HealthSnapshotEntity> findHistoryByComputerId(@Param("computerId") UUID computerId, Pageable pageable);
}
