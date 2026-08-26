package com.vellor.care.application.maintenance;

import com.vellor.care.domain.model.Maintenance;
import com.vellor.care.domain.model.MaintenanceStatus;
import com.vellor.care.domain.repository.MaintenanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RescheduleMaintenanceUseCase {

    private final MaintenanceRepository maintenanceRepository;

    @Transactional
    public Maintenance execute(UUID maintenanceId, LocalDate newDate) {
        Maintenance maintenance = maintenanceRepository.findById(maintenanceId)
            .orElseThrow(() -> new IllegalArgumentException("Manutenção não encontrada: " + maintenanceId));

        if (maintenance.status() == MaintenanceStatus.CONCLUIDA || maintenance.status() == MaintenanceStatus.CANCELADA) {
            throw new IllegalStateException("Não é possível reagendar uma manutenção concluída ou cancelada.");
        }

        Maintenance updated = new Maintenance(
            maintenance.id(),
            maintenance.computerId(),
            maintenance.assetTag(),
            maintenance.hostname(),
            maintenance.sectorId(),
            maintenance.technicianId(),
            maintenance.technicianName(),
            maintenance.type(),
            MaintenanceStatus.AGENDADA,
            maintenance.priority(),
            newDate,
            maintenance.startedAt(),
            maintenance.finishedAt(),
            maintenance.durationMinutes(),
            maintenance.checklist(),
            maintenance.parts(),
            maintenance.photos(),
            maintenance.notes(),
            maintenance.signatureDataUrl(),
            maintenance.createdAt(),
            Instant.now()
        );

        return maintenanceRepository.save(updated);
    }
}
