package com.vellor.care.domain.repository;

import com.vellor.care.domain.model.InventoryMovement;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InventoryMovementRepository {
    Optional<InventoryMovement> findById(UUID id);
    List<InventoryMovement> findAll();
    List<InventoryMovement> findByPartId(UUID partId);
    List<InventoryMovement> findByMaintenanceId(UUID maintenanceId);
    InventoryMovement save(InventoryMovement movement);
    long count();
}
