package com.vellor.care.infrastructure.persistence.adapter;

import com.vellor.care.domain.model.Sector;
import com.vellor.care.domain.repository.SectorRepository;
import com.vellor.care.infrastructure.persistence.entity.SectorEntity;
import com.vellor.care.infrastructure.persistence.mapper.SectorMapper;
import com.vellor.care.infrastructure.persistence.springdata.JpaSectorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class SectorRepositoryAdapter implements SectorRepository {

    private final JpaSectorRepository jpaSectorRepository;
    private final SectorMapper sectorMapper;

    @Override
    public Optional<Sector> findById(UUID id) {
        return jpaSectorRepository.findById(id)
            .map(sectorMapper::toDomain);
    }

    @Override
    public Optional<Sector> findByCode(String code) {
        return jpaSectorRepository.findByCode(code)
            .map(sectorMapper::toDomain);
    }

    @Override
    public List<Sector> findAll() {
        return jpaSectorRepository.findAll().stream()
            .map(sectorMapper::toDomain)
            .toList();
    }

    @Override
    public List<Sector> findByUnitId(UUID unitId) {
        return jpaSectorRepository.findByUnitId(unitId).stream()
            .map(sectorMapper::toDomain)
            .toList();
    }

    @Override
    public Sector save(Sector sector) {
        SectorEntity entity = sectorMapper.toEntity(sector);
        SectorEntity saved = jpaSectorRepository.save(entity);
        return sectorMapper.toDomain(saved);
    }

    @Override
    public void deleteById(UUID id) {
        jpaSectorRepository.deleteById(id);
    }

    @Override
    public long count() {
        return jpaSectorRepository.count();
    }
}
