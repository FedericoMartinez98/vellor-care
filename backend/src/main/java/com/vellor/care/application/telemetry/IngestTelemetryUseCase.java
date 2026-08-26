package com.vellor.care.application.telemetry;

import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.model.ComputerSystem;
import com.vellor.care.domain.model.HealthSnapshot;
import com.vellor.care.domain.model.HealthSource;
import com.vellor.care.domain.repository.ComputerRepository;
import com.vellor.care.domain.repository.HealthSnapshotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class IngestTelemetryUseCase {

    private final ComputerRepository computerRepository;
    private final HealthSnapshotRepository healthSnapshotRepository;

    @Transactional
    public HealthSnapshot execute(TelemetryIngestCommand command) {
        // Localiza por assetTag ou hostname
        Optional<Computer> optComp = computerRepository.findByAssetTag(command.assetTag());
        if (optComp.isEmpty() && command.hostname() != null) {
            optComp = computerRepository.findByHostname(command.hostname());
        }

        if (optComp.isEmpty()) {
            throw new IllegalArgumentException("Nenhum equipamento cadastrado corresponde ao assetTag: " + command.assetTag() + " ou hostname: " + command.hostname());
        }

        Computer computer = optComp.get();
        Instant now = Instant.now();

        HealthSnapshot snapshot = new HealthSnapshot(
            UUID.randomUUID(),
            computer.id(),
            command.collectedAt() != null ? command.collectedAt() : now,
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
            HealthSource.AGENTE
        );

        HealthSnapshot saved = healthSnapshotRepository.save(snapshot);

        // Atualiza versão do Windows / Build se fornecidos
        if (command.windowsVersion() != null || command.windowsBuild() != null) {
            ComputerSystem currentSys = computer.system();
            ComputerSystem updatedSys = new ComputerSystem(
                command.windowsVersion() != null ? command.windowsVersion() : (currentSys != null ? currentSys.windowsVersion() : ""),
                command.windowsBuild() != null ? command.windowsBuild() : (currentSys != null ? currentSys.windowsBuild() : null),
                currentSys != null ? currentSys.officeVersion() : null,
                currentSys != null ? currentSys.antivirus() : null,
                currentSys != null ? currentSys.lastWindowsUpdate() : null,
                currentSys != null && currentSys.domainJoined()
            );

            Computer updatedComp = new Computer(
                computer.id(),
                computer.assetTag(),
                computer.hostname(),
                computer.serialNumber(),
                computer.model(),
                computer.manufacturer(),
                computer.assignment(),
                computer.hardware(),
                updatedSys,
                computer.warranty(),
                computer.status(),
                computer.notes(),
                computer.photoUrl(),
                computer.qrPayload(),
                computer.lastMaintenanceAt(),
                computer.nextMaintenanceAt(),
                computer.maintenanceIntervalDays(),
                saved,
                computer.createdAt(),
                now
            );
            computerRepository.save(updatedComp);
        }

        log.info("Telemetria do equipamento {} recebida via agente Windows.", computer.assetTag());
        return saved;
    }

    public record TelemetryIngestCommand(
        String assetTag,
        String hostname,
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
        String windowsVersion,
        String windowsBuild
    ) {}
}
