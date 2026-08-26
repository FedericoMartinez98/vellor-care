package com.vellor.care.infrastructure.persistence.adapter;

import com.vellor.care.domain.model.Maintenance;
import com.vellor.care.domain.model.MaintenanceStatus;
import com.vellor.care.domain.model.MaintenanceType;
import com.vellor.care.domain.repository.MaintenanceRepository;
import com.vellor.care.infrastructure.persistence.entity.MaintenanceEntity;
import com.vellor.care.infrastructure.persistence.mapper.MaintenanceMapper;
import com.vellor.care.infrastructure.persistence.springdata.JpaMaintenanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class MaintenanceRepositoryAdapter implements MaintenanceRepository {

    private final JpaMaintenanceRepository jpaMaintenanceRepository;
    private final MaintenanceMapper maintenanceMapper;

    @Override
    public Optional<Maintenance> findById(UUID id) {
        return jpaMaintenanceRepository.findById(id)
            .map(maintenanceMapper::toDomain);
    }

    @Override
    public List<Maintenance> findAll() {
        return jpaMaintenanceRepository.findAll().stream()
            .map(maintenanceMapper::toDomain)
            .toList();
    }

    @Override
    public List<Maintenance> findByComputerId(UUID computerId) {
        return jpaMaintenanceRepository.findByComputerIdOrderByScheduledForDesc(computerId).stream()
            .map(maintenanceMapper::toDomain)
            .toList();
    }

    @Override
    public List<Maintenance> findBySectorId(UUID sectorId) {
        return jpaMaintenanceRepository.findBySectorId(sectorId).stream()
            .map(maintenanceMapper::toDomain)
            .toList();
    }

    @Override
    public List<Maintenance> findByTechnicianId(UUID technicianId) {
        return jpaMaintenanceRepository.findByTechnicianId(technicianId).stream()
            .map(maintenanceMapper::toDomain)
            .toList();
    }

    @Override
    public List<Maintenance> findByStatus(MaintenanceStatus status) {
        return jpaMaintenanceRepository.findByStatus(status).stream()
            .map(maintenanceMapper::toDomain)
            .toList();
    }

    @Override
    public List<Maintenance> findByType(MaintenanceType type) {
        return jpaMaintenanceRepository.findByType(type).stream()
            .map(maintenanceMapper::toDomain)
            .toList();
    }

    @Override
    public List<Maintenance> findBetweenDates(LocalDate from, LocalDate to) {
        return jpaMaintenanceRepository.findBetweenDates(from, to).stream()
            .map(maintenanceMapper::toDomain)
            .toList();
    }

    @Override
    public Maintenance save(Maintenance maintenance) {
        MaintenanceEntity entity = maintenanceMapper.toEntity(maintenance);
        MaintenanceEntity saved = jpaMaintenanceRepository.save(entity);
        return maintenanceMapper.toDomain(saved);
    }

    @Override
    public void deleteById(UUID id) {
        jpaMaintenanceRepository.deleteById(id);
    }

    @Override
    public long count() {
        return jpaMaintenanceRepository.count();
    }
}
