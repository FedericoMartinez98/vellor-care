package com.vellor.care.infrastructure.persistence.springdata;

import com.vellor.care.infrastructure.persistence.entity.InventoryMovementEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface JpaMovementRepository extends JpaRepository<InventoryMovementEntity, UUID> {

    List<InventoryMovementEntity> findByPartIdOrderByCreatedAtDesc(UUID partId);

    List<InventoryMovementEntity> findByMaintenanceIdOrderByCreatedAtDesc(UUID maintenanceId);

    List<InventoryMovementEntity> findAllByOrderByCreatedAtDesc();
}
