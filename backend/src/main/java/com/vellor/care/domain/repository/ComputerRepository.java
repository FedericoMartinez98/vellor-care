package com.vellor.care.domain.repository;

import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.model.ComputerStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ComputerRepository {
    Optional<Computer> findById(UUID id);
    Optional<Computer> findByAssetTag(String assetTag);
    Optional<Computer> findByHostname(String hostname);
    Optional<Computer> findBySerialNumber(String serialNumber);
    List<Computer> findAll();
    List<Computer> findBySectorId(UUID sectorId);
    List<Computer> findByStatus(ComputerStatus status);
    List<Computer> findOverdueMaintenances(LocalDate date);
    List<Computer> search(String query);
    Computer save(Computer computer);
    void deleteById(UUID id);
    long count();
}
