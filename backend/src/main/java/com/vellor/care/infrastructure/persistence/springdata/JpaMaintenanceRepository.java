package com.vellor.care.infrastructure.persistence.springdata;

import com.vellor.care.domain.model.MaintenanceStatus;
import com.vellor.care.domain.model.MaintenanceType;
import com.vellor.care.infrastructure.persistence.entity.MaintenanceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface JpaMaintenanceRepository extends JpaRepository<MaintenanceEntity, UUID> {

    List<MaintenanceEntity> findByComputerIdOrderByScheduledForDesc(UUID computerId);

    @Query("SELECT m FROM MaintenanceEntity m JOIN m.computer c WHERE c.sectorId = :sectorId")
    List<MaintenanceEntity> findBySectorId(@Param("sectorId") UUID sectorId);

    List<MaintenanceEntity> findByTechnicianId(UUID technicianId);

    List<MaintenanceEntity> findByStatus(MaintenanceStatus status);

    List<MaintenanceEntity> findByType(MaintenanceType type);

    @Query("SELECT m FROM MaintenanceEntity m WHERE m.scheduledFor BETWEEN :from AND :to ORDER BY m.scheduledFor ASC")
    List<MaintenanceEntity> findBetweenDates(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
