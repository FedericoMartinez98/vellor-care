package com.vellor.care.domain.repository;

import com.vellor.care.domain.model.Maintenance;
import com.vellor.care.domain.model.MaintenanceStatus;
import com.vellor.care.domain.model.MaintenanceType;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MaintenanceRepository {
    Optional<Maintenance> findById(UUID id);
    List<Maintenance> findAll();
    List<Maintenance> findByComputerId(UUID computerId);
    List<Maintenance> findBySectorId(UUID sectorId);
    List<Maintenance> findByTechnicianId(UUID technicianId);
    List<Maintenance> findByStatus(MaintenanceStatus status);
    List<Maintenance> findByType(MaintenanceType type);
    List<Maintenance> findBetweenDates(LocalDate from, LocalDate to);
    Maintenance save(Maintenance maintenance);
    void deleteById(UUID id);
    long count();
}
