package com.vellor.care.domain.repository;

import com.vellor.care.domain.model.InventoryPart;
import com.vellor.care.domain.model.PartCategory;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InventoryPartRepository {
    Optional<InventoryPart> findById(UUID id);
    Optional<InventoryPart> findBySku(String sku);
    List<InventoryPart> findAll();
    List<InventoryPart> findByCategory(PartCategory category);
    List<InventoryPart> findLowStock();
    InventoryPart save(InventoryPart part);
    void deleteById(UUID id);
    long count();
}
