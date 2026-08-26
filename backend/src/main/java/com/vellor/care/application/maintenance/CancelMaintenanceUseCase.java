package com.vellor.care.application.maintenance;

import com.vellor.care.domain.model.Maintenance;
import com.vellor.care.domain.model.MaintenanceStatus;
import com.vellor.care.domain.repository.MaintenanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CancelMaintenanceUseCase {

    private final MaintenanceRepository maintenanceRepository;

    @Transactional
    public Maintenance execute(UUID maintenanceId, String reason) {
        Maintenance maintenance = maintenanceRepository.findById(maintenanceId)
            .orElseThrow(() -> new IllegalArgumentException("Manutenção não encontrada: " + maintenanceId));

        if (maintenance.status() == MaintenanceStatus.CONCLUIDA) {
            throw new IllegalStateException("Não é possível cancelar uma manutenção já concluída.");
        }

        String updatedNotes = maintenance.notes() != null && !maintenance.notes().isBlank()
            ? maintenance.notes() + "\n[Cancelada]: " + reason
            : "[Cancelada]: " + reason;

        Maintenance updated = new Maintenance(
            maintenance.id(),
            maintenance.computerId(),
            maintenance.assetTag(),
            maintenance.hostname(),
            maintenance.sectorId(),
            maintenance.technicianId(),
            maintenance.technicianName(),
            maintenance.type(),
            MaintenanceStatus.CANCELADA,
            maintenance.priority(),
            maintenance.scheduledFor(),
            maintenance.startedAt(),
            Instant.now(),
            maintenance.durationMinutes(),
            maintenance.checklist(),
            maintenance.parts(),
            maintenance.photos(),
            updatedNotes,
            maintenance.signatureDataUrl(),
            maintenance.createdAt(),
            Instant.now()
        );

        return maintenanceRepository.save(updated);
    }
}
