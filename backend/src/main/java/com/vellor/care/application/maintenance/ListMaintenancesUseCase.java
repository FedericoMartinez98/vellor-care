package com.vellor.care.application.maintenance;

import com.vellor.care.domain.model.Maintenance;
import com.vellor.care.domain.model.MaintenanceStatus;
import com.vellor.care.domain.model.MaintenanceType;
import com.vellor.care.domain.repository.MaintenanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Leitura de manutencoes. Precisa ser transacional: o MaintenanceMapper deriva
 * assetTag/hostname/technicianName das associacoes lazy `computer`/`technician`,
 * e fora de uma sessao Hibernate aberta isso estoura
 * LazyInitializationException (500) -- era o que acontecia em GET /maintenances.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ListMaintenancesUseCase {

    private final MaintenanceRepository maintenanceRepository;

    public List<Maintenance> executeAll() {
        return maintenanceRepository.findAll();
    }

    public List<Maintenance> executeByComputer(UUID computerId) {
        return maintenanceRepository.findByComputerId(computerId);
    }

    public List<Maintenance> executeBySector(UUID sectorId) {
        return maintenanceRepository.findBySectorId(sectorId);
    }

    public List<Maintenance> executeByTechnician(UUID technicianId) {
        return maintenanceRepository.findByTechnicianId(technicianId);
    }

    public List<Maintenance> executeByStatus(MaintenanceStatus status) {
        return maintenanceRepository.findByStatus(status);
    }

    public List<Maintenance> executeByType(MaintenanceType type) {
        return maintenanceRepository.findByType(type);
    }

    public List<Maintenance> executeBetweenDates(LocalDate from, LocalDate to) {
        return maintenanceRepository.findBetweenDates(from, to);
    }
}
