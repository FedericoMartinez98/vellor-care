package com.vellor.care.infrastructure.persistence.adapter;

import com.vellor.care.domain.model.InventoryMovement;
import com.vellor.care.domain.repository.InventoryMovementRepository;
import com.vellor.care.infrastructure.persistence.entity.InventoryMovementEntity;
import com.vellor.care.infrastructure.persistence.mapper.PartMapper;
import com.vellor.care.infrastructure.persistence.springdata.JpaMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class InventoryMovementRepositoryAdapter implements InventoryMovementRepository {

    private final JpaMovementRepository jpaMovementRepository;
    private final PartMapper partMapper;

    @Override
    public Optional<InventoryMovement> findById(UUID id) {
        return jpaMovementRepository.findById(id)
            .map(partMapper::toDomain);
    }

    @Override
    public List<InventoryMovement> findAll() {
        return jpaMovementRepository.findAllByOrderByCreatedAtDesc().stream()
            .map(partMapper::toDomain)
            .toList();
    }

    @Override
    public List<InventoryMovement> findByPartId(UUID partId) {
        return jpaMovementRepository.findByPartIdOrderByCreatedAtDesc(partId).stream()
            .map(partMapper::toDomain)
            .toList();
    }

    @Override
    public List<InventoryMovement> findByMaintenanceId(UUID maintenanceId) {
        return jpaMovementRepository.findByMaintenanceIdOrderByCreatedAtDesc(maintenanceId).stream()
            .map(partMapper::toDomain)
            .toList();
    }

    @Override
    public InventoryMovement save(InventoryMovement movement) {
        InventoryMovementEntity entity = partMapper.toEntity(movement);
        InventoryMovementEntity saved = jpaMovementRepository.save(entity);
        return partMapper.toDomain(saved);
    }

    @Override
    public long count() {
        return jpaMovementRepository.count();
    }
}
