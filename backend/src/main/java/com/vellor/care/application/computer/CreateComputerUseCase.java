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
public class CreateComputerUseCase {

    private final ComputerRepository computerRepository;

    @Transactional
    public Computer execute(CreateComputerCommand command) {
        if (computerRepository.findByAssetTag(command.assetTag()).isPresent()) {
            throw new IllegalArgumentException("Já existe um computador cadastrado com o patrimônio: " + command.assetTag());
        }
        if (computerRepository.findByHostname(command.hostname()).isPresent()) {
            throw new IllegalArgumentException("Já existe um computador cadastrado com o hostname: " + command.hostname());
        }

        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        LocalDate nextMaintenance = command.nextMaintenanceAt() != null
            ? command.nextMaintenanceAt()
            : LocalDate.now().plusDays(command.maintenanceIntervalDays() > 0 ? command.maintenanceIntervalDays() : 90);

        String qrPayload = command.qrPayload() != null && !command.qrPayload().isBlank()
            ? command.qrPayload()
            : "http://localhost:3000/inventario/" + id;

        Computer computer = new Computer(
            id,
            command.assetTag().trim().toUpperCase(),
            command.hostname().trim().toUpperCase(),
            command.serialNumber().trim(),
            command.model().trim(),
            command.manufacturer().trim(),
            command.assignment(),
            command.hardware(),
            command.system(),
            command.warranty(),
            command.status() != null ? command.status() : ComputerStatus.ATIVO,
            command.notes(),
            command.photoUrl(),
            qrPayload,
            null,
            nextMaintenance,
            command.maintenanceIntervalDays() > 0 ? command.maintenanceIntervalDays() : 90,
            null,
            now,
            now
        );

        return computerRepository.save(computer);
    }

    public record CreateComputerCommand(
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
        String qrPayload,
        LocalDate nextMaintenanceAt,
        int maintenanceIntervalDays
    ) {}
}
