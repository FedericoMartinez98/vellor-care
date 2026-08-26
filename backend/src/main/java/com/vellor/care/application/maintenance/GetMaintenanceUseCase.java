package com.vellor.care.application.maintenance;

import com.vellor.care.domain.model.Maintenance;
import com.vellor.care.domain.repository.MaintenanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GetMaintenanceUseCase {

    private final MaintenanceRepository maintenanceRepository;

    public Optional<Maintenance> execute(UUID id) {
        return maintenanceRepository.findById(id);
    }
}
