package com.vellor.care.application.computer;

import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.model.HealthSnapshot;
import com.vellor.care.domain.model.HealthSource;
import com.vellor.care.domain.repository.ComputerRepository;
import com.vellor.care.domain.repository.HealthSnapshotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RecordHealthSnapshotUseCase {

    private final ComputerRepository computerRepository;
    private final HealthSnapshotRepository healthSnapshotRepository;

    @Transactional
    public HealthSnapshot execute(UUID computerId, RecordHealthSnapshotCommand command) {
        Computer computer = computerRepository.findById(computerId)
            .orElseThrow(() -> new IllegalArgumentException("Computador não encontrado: " + computerId));

        HealthSnapshot snapshot = new HealthSnapshot(
            UUID.randomUUID(),
            computer.id(),
            command.collectedAt() != null ? command.collectedAt() : Instant.now(),
            command.ssdHealthPercent(),
            command.ssdPowerOnHours(),
            command.cpuTempC(),
            command.gpuTempC(),
            command.ssdTempC(),
            command.cpuUsagePercent(),
            command.ramUsagePercent(),
            command.diskFreePercent(),
            command.diskFreeGb(),
            command.uptimeHours(),
            command.lastBootAt(),
            command.source() != null ? command.source() : HealthSource.MANUAL
        );

        return healthSnapshotRepository.save(snapshot);
    }

    public record RecordHealthSnapshotCommand(
        Instant collectedAt,
        BigDecimal ssdHealthPercent,
        Integer ssdPowerOnHours,
        BigDecimal cpuTempC,
        BigDecimal gpuTempC,
        BigDecimal ssdTempC,
        BigDecimal cpuUsagePercent,
        BigDecimal ramUsagePercent,
        BigDecimal diskFreePercent,
        BigDecimal diskFreeGb,
        BigDecimal uptimeHours,
        Instant lastBootAt,
        HealthSource source
    ) {}
}
