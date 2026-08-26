package com.vellor.care.infrastructure.persistence.adapter;

import com.vellor.care.domain.model.InventoryPart;
import com.vellor.care.domain.model.PartCategory;
import com.vellor.care.domain.repository.InventoryPartRepository;
import com.vellor.care.infrastructure.persistence.entity.InventoryPartEntity;
import com.vellor.care.infrastructure.persistence.mapper.PartMapper;
import com.vellor.care.infrastructure.persistence.springdata.JpaPartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class InventoryPartRepositoryAdapter implements InventoryPartRepository {

    private final JpaPartRepository jpaPartRepository;
    private final PartMapper partMapper;

    @Override
    public Optional<InventoryPart> findById(UUID id) {
        return jpaPartRepository.findById(id)
            .map(partMapper::toDomain);
    }

    @Override
    public Optional<InventoryPart> findBySku(String sku) {
        return jpaPartRepository.findBySku(sku)
            .map(partMapper::toDomain);
    }

    @Override
    public List<InventoryPart> findAll() {
        return jpaPartRepository.findAll().stream()
            .map(partMapper::toDomain)
            .toList();
    }

    @Override
    public List<InventoryPart> findByCategory(PartCategory category) {
        return jpaPartRepository.findByCategory(category).stream()
            .map(partMapper::toDomain)
            .toList();
    }

    @Override
    public List<InventoryPart> findLowStock() {
        return jpaPartRepository.findLowStock().stream()
            .map(partMapper::toDomain)
            .toList();
    }

    @Override
    public InventoryPart save(InventoryPart part) {
        InventoryPartEntity entity = partMapper.toEntity(part);
        InventoryPartEntity saved = jpaPartRepository.save(entity);
        return partMapper.toDomain(saved);
    }

    @Override
    public void deleteById(UUID id) {
        jpaPartRepository.deleteById(id);
    }

    @Override
    public long count() {
        return jpaPartRepository.count();
    }
}
