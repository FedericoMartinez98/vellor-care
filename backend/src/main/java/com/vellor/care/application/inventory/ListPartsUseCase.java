package com.vellor.care.application.inventory;

import com.vellor.care.domain.model.InventoryMovement;
import com.vellor.care.domain.model.InventoryPart;
import com.vellor.care.domain.model.PartCategory;
import com.vellor.care.domain.repository.InventoryMovementRepository;
import com.vellor.care.domain.repository.InventoryPartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ListPartsUseCase {

    private final InventoryPartRepository partRepository;
    private final InventoryMovementRepository movementRepository;

    public List<InventoryPart> executeAll() {
        return partRepository.findAll();
    }

    public Optional<InventoryPart> executeById(UUID id) {
        return partRepository.findById(id);
    }

    public List<InventoryPart> executeByCategory(PartCategory category) {
        return partRepository.findByCategory(category);
    }

    public List<InventoryPart> executeLowStock() {
        return partRepository.findLowStock();
    }

    public List<InventoryMovement> executeMovements() {
        return movementRepository.findAll();
    }

    public List<InventoryMovement> executeMovementsByPart(UUID partId) {
        return movementRepository.findByPartId(partId);
    }
}
