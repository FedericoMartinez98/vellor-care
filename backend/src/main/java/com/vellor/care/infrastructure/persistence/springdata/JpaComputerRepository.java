package com.vellor.care.infrastructure.persistence.springdata;

import com.vellor.care.domain.model.ComputerStatus;
import com.vellor.care.infrastructure.persistence.entity.ComputerEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JpaComputerRepository extends JpaRepository<ComputerEntity, UUID> {

    Optional<ComputerEntity> findByAssetTag(String assetTag);

    Optional<ComputerEntity> findByHostname(String hostname);

    Optional<ComputerEntity> findBySerialNumber(String serialNumber);

    List<ComputerEntity> findBySectorId(UUID sectorId);

    List<ComputerEntity> findByStatus(ComputerStatus status);

    @Query("SELECT c FROM ComputerEntity c WHERE c.status = 'ATIVO' AND (c.nextMaintenanceAt IS NULL OR c.nextMaintenanceAt <= :date)")
    List<ComputerEntity> findOverdueMaintenances(@Param("date") LocalDate date);

    @Query("SELECT c FROM ComputerEntity c WHERE " +
           "LOWER(c.assetTag) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.hostname) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.employeeName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.model) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<ComputerEntity> search(@Param("query") String query);
}
