package com.vellor.care.application.maintenance;

import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.model.ComputerStatus;
import com.vellor.care.domain.model.Maintenance;
import com.vellor.care.domain.model.MaintenanceStatus;
import com.vellor.care.domain.repository.ComputerRepository;
import com.vellor.care.domain.repository.MaintenanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StartMaintenanceUseCase {

    private final MaintenanceRepository maintenanceRepository;
    private final ComputerRepository computerRepository;

    @Transactional
    public Maintenance execute(UUID maintenanceId) {
        Maintenance maintenance = maintenanceRepository.findById(maintenanceId)
            .orElseThrow(() -> new IllegalArgumentException("Manutenção não encontrada: " + maintenanceId));

        if (maintenance.status() == MaintenanceStatus.CONCLUIDA || maintenance.status() == MaintenanceStatus.CANCELADA) {
            throw new IllegalStateException("Não é possível iniciar uma manutenção já finalizada ou cancelada.");
        }

        Instant now = Instant.now();

        Maintenance started = new Maintenance(
            maintenance.id(),
            maintenance.computerId(),
            maintenance.assetTag(),
            maintenance.hostname(),
            maintenance.sectorId(),
            maintenance.technicianId(),
            maintenance.technicianName(),
            maintenance.type(),
            MaintenanceStatus.EM_ANDAMENTO,
            maintenance.priority(),
            maintenance.scheduledFor(),
            maintenance.startedAt() != null ? maintenance.startedAt() : now,
            maintenance.finishedAt(),
            maintenance.durationMinutes(),
            maintenance.checklist(),
            maintenance.parts(),
            maintenance.photos(),
            maintenance.notes(),
            maintenance.signatureDataUrl(),
            maintenance.createdAt(),
            now
        );

        // Atualiza status do computador para EM_MANUTENCAO
        computerRepository.findById(maintenance.computerId()).ifPresent(c -> {
            Computer updated = new Computer(
                c.id(),
                c.assetTag(),
                c.hostname(),
                c.serialNumber(),
                c.model(),
                c.manufacturer(),
                c.assignment(),
                c.hardware(),
                c.system(),
                c.warranty(),
                ComputerStatus.EM_MANUTENCAO,
                c.notes(),
                c.photoUrl(),
                c.qrPayload(),
                c.lastMaintenanceAt(),
                c.nextMaintenanceAt(),
                c.maintenanceIntervalDays(),
                c.latestHealth(),
                c.createdAt(),
                Instant.now()
            );
            computerRepository.save(updated);
        });

        return maintenanceRepository.save(started);
    }
}
