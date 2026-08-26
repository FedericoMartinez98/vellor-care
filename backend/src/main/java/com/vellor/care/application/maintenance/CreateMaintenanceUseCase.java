package com.vellor.care.application.maintenance;

import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.model.Maintenance;
import com.vellor.care.domain.model.MaintenanceStatus;
import com.vellor.care.domain.model.MaintenanceType;
import com.vellor.care.domain.model.Priority;
import com.vellor.care.domain.model.User;
import com.vellor.care.domain.repository.ComputerRepository;
import com.vellor.care.domain.repository.MaintenanceRepository;
import com.vellor.care.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CreateMaintenanceUseCase {

    private final MaintenanceRepository maintenanceRepository;
    private final ComputerRepository computerRepository;
    private final UserRepository userRepository;

    @Transactional
    public Maintenance execute(CreateMaintenanceCommand command) {
        Computer computer = computerRepository.findById(command.computerId())
            .orElseThrow(() -> new IllegalArgumentException("Computador não encontrado: " + command.computerId()));

        User technician = userRepository.findById(command.technicianId())
            .orElseThrow(() -> new IllegalArgumentException("Técnico não encontrado: " + command.technicianId()));

        UUID id = UUID.randomUUID();
        Instant now = Instant.now();

        Maintenance maintenance = new Maintenance(
            id,
            computer.id(),
            computer.assetTag(),
            computer.hostname(),
            computer.assignment() != null ? computer.assignment().sectorId() : null,
            technician.id(),
            technician.name(),
            command.type() != null ? command.type() : MaintenanceType.PREVENTIVA,
            MaintenanceStatus.AGENDADA,
            command.priority() != null ? command.priority() : Priority.MEDIA,
            command.scheduledFor() != null ? command.scheduledFor() : LocalDate.now(),
            null,
            null,
            null,
            Collections.emptyList(),
            Collections.emptyList(),
            Collections.emptyList(),
            command.notes(),
            null,
            now,
            now
        );

        return maintenanceRepository.save(maintenance);
    }

    public record CreateMaintenanceCommand(
        UUID computerId,
        UUID technicianId,
        MaintenanceType type,
        Priority priority,
        LocalDate scheduledFor,
        String notes
    ) {}
}
