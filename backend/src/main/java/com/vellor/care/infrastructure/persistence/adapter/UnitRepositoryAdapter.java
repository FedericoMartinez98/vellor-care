package com.vellor.care.infrastructure.persistence.adapter;

import com.vellor.care.domain.model.Unit;
import com.vellor.care.domain.repository.UnitRepository;
import com.vellor.care.infrastructure.persistence.entity.UnitEntity;
import com.vellor.care.infrastructure.persistence.mapper.UnitMapper;
import com.vellor.care.infrastructure.persistence.springdata.JpaUnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class UnitRepositoryAdapter implements UnitRepository {

    private final JpaUnitRepository jpaUnitRepository;
    private final UnitMapper unitMapper;

    @Override
    public Optional<Unit> findById(UUID id) {
        return jpaUnitRepository.findById(id)
            .map(unitMapper::toDomain);
    }

    @Override
    public Optional<Unit> findByCode(String code) {
        return jpaUnitRepository.findByCode(code)
            .map(unitMapper::toDomain);
    }

    @Override
    public List<Unit> findAll() {
        return jpaUnitRepository.findAll().stream()
            .map(unitMapper::toDomain)
            .toList();
    }

    @Override
    public Unit save(Unit unit) {
        UnitEntity entity = unitMapper.toEntity(unit);
        UnitEntity saved = jpaUnitRepository.save(entity);
        return unitMapper.toDomain(saved);
    }
}
