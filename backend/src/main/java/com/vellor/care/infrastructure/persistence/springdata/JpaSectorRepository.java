package com.vellor.care.infrastructure.persistence.springdata;

import com.vellor.care.infrastructure.persistence.entity.SectorEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JpaSectorRepository extends JpaRepository<SectorEntity, UUID> {

    Optional<SectorEntity> findByCode(String code);

    List<SectorEntity> findByUnitId(UUID unitId);
}
