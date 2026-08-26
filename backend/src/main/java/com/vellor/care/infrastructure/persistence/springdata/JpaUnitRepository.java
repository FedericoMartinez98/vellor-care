package com.vellor.care.infrastructure.persistence.springdata;

import com.vellor.care.infrastructure.persistence.entity.UnitEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface JpaUnitRepository extends JpaRepository<UnitEntity, UUID> {

    Optional<UnitEntity> findByCode(String code);
}
