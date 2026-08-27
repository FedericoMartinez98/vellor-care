package com.vellor.care.application.maintenance;

import com.vellor.care.domain.model.Maintenance;
import com.vellor.care.domain.repository.MaintenanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/** Transacional pelo mesmo motivo do ListMaintenancesUseCase (associacoes lazy). */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GetMaintenanceUseCase {

    private final MaintenanceRepository maintenanceRepository;

    public Optional<Maintenance> execute(UUID id) {
        return maintenanceRepository.findById(id);
    }
}
