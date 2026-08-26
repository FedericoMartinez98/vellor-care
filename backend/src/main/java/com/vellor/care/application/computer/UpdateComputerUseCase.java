package com.vellor.care.application.computer;

import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.model.ComputerAssignment;
import com.vellor.care.domain.model.ComputerHardware;
import com.vellor.care.domain.model.ComputerStatus;
import com.vellor.care.domain.model.ComputerSystem;
import com.vellor.care.domain.model.ComputerWarranty;
import com.vellor.care.domain.repository.ComputerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UpdateComputerUseCase {

    private final ComputerRepository computerRepository;

    @Transactional
    public Computer execute(UUID id, UpdateComputerCommand command) {
        Computer existing = computerRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Computador não encontrado: " + id));

        // Valida unicidade caso tenha alterado
        if (!existing.assetTag().equalsIgnoreCase(command.assetTag())) {
            computerRepository.findByAssetTag(command.assetTag()).ifPresent(c -> {
                throw new IllegalArgumentException("Já existe outro computador com o patrimônio: " + command.assetTag());
            });
        }
        if (!existing.hostname().equalsIgnoreCase(command.hostname())) {
            computerRepository.findByHostname(command.hostname()).ifPresent(c -> {
                throw new IllegalArgumentException("Já existe outro computador com o hostname: " + command.hostname());
            });
        }

        Computer updated = new Computer(
            existing.id(),
            command.assetTag().trim().toUpperCase(),
            command.hostname().trim().toUpperCase(),
            command.serialNumber().trim(),
            command.model().trim(),
            command.manufacturer().trim(),
            command.assignment() != null ? command.assignment() : existing.assignment(),
            command.hardware() != null ? command.hardware() : existing.hardware(),
            command.system() != null ? command.system() : existing.system(),
            command.warranty() != null ? command.warranty() : existing.warranty(),
            command.status() != null ? command.status() : existing.status(),
            command.notes(),
            command.photoUrl() != null ? command.photoUrl() : existing.photoUrl(),
            existing.qrPayload(),
            existing.lastMaintenanceAt(),
            command.nextMaintenanceAt() != null ? command.nextMaintenanceAt() : existing.nextMaintenanceAt(),
            command.maintenanceIntervalDays() > 0 ? command.maintenanceIntervalDays() : existing.maintenanceIntervalDays(),
            existing.latestHealth(),
            existing.createdAt(),
            Instant.now()
        );

        return computerRepository.save(updated);
    }

    public record UpdateComputerCommand(
        String assetTag,
        String hostname,
        String serialNumber,
        String model,
        String manufacturer,
        ComputerAssignment assignment,
        ComputerHardware hardware,
        ComputerSystem system,
        ComputerWarranty warranty,
        ComputerStatus status,
        String notes,
        String photoUrl,
        LocalDate nextMaintenanceAt,
        int maintenanceIntervalDays
    ) {}
}
