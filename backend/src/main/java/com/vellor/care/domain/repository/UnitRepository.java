package com.vellor.care.domain.repository;

import com.vellor.care.domain.model.Unit;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UnitRepository {
    Optional<Unit> findById(UUID id);
    Optional<Unit> findByCode(String code);
    List<Unit> findAll();
    Unit save(Unit unit);
}
