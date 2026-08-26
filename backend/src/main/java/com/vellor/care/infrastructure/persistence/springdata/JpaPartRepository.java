package com.vellor.care.infrastructure.persistence.springdata;

import com.vellor.care.domain.model.PartCategory;
import com.vellor.care.infrastructure.persistence.entity.InventoryPartEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JpaPartRepository extends JpaRepository<InventoryPartEntity, UUID> {

    Optional<InventoryPartEntity> findBySku(String sku);

    List<InventoryPartEntity> findByCategory(PartCategory category);

    @Query("SELECT p FROM InventoryPartEntity p WHERE p.quantity <= p.minimumQuantity")
    List<InventoryPartEntity> findLowStock();
}
