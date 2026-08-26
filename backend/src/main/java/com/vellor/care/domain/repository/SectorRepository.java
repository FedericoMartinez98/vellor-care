package com.vellor.care.domain.repository;

import com.vellor.care.domain.model.Sector;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SectorRepository {
    Optional<Sector> findById(UUID id);
    Optional<Sector> findByCode(String code);
    List<Sector> findAll();
    List<Sector> findByUnitId(UUID unitId);
    Sector save(Sector sector);
    void deleteById(UUID id);
    long count();
}
