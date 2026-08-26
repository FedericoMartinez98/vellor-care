package com.vellor.care.application.telemetry;

import com.vellor.care.application.computer.CreateComputerUseCase;
import com.vellor.care.domain.model.AppNotification;
import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.model.ComputerAssignment;
import com.vellor.care.domain.model.ComputerHardware;
import com.vellor.care.domain.model.ComputerStatus;
import com.vellor.care.domain.model.ComputerSystem;
import com.vellor.care.domain.model.ComputerWarranty;
import com.vellor.care.domain.model.HealthSnapshot;
import com.vellor.care.domain.model.NotificationType;
import com.vellor.care.domain.model.Sector;
import com.vellor.care.domain.model.Severity;
import com.vellor.care.domain.model.StorageType;
import com.vellor.care.domain.model.Unit;
import com.vellor.care.domain.repository.ComputerRepository;
import com.vellor.care.domain.repository.NotificationRepository;
import com.vellor.care.domain.repository.SectorRepository;
import com.vellor.care.domain.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

/**
 * Ponto de entrada da importacao de telemetria por CSV: para cada linha,
 * casa o computador por assetTag/hostname.
 *
 * - Se NAO existir: cadastra um novo computador com o que o coletor Windows
 *   sabe (hardware) e um setor/unidade provisorios "Nao Classificado", que
 *   a equipe deve corrigir depois pela tela de inventario.
 * - Se JA existir: grava o snapshot de saude (datado de hoje) e dispara uma
 *   notificacao de sistema avisando que o equipamento reportou telemetria.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RegisterOrUpdateTelemetryUseCase {

    private static final String FALLBACK_UNIT_CODE = "NAOCLASS";
    private static final String FALLBACK_SECTOR_CODE = "NAOCLASS";

    private final ComputerRepository computerRepository;
    private final SectorRepository sectorRepository;
    private final UnitRepository unitRepository;
    private final NotificationRepository notificationRepository;
    private final CreateComputerUseCase createComputerUseCase;
    private final IngestTelemetryUseCase ingestTelemetryUseCase;

    public enum Outcome { CREATED, UPDATED }

    public record Result(Outcome outcome, Computer computer, HealthSnapshot snapshot) {}

    @Transactional
    public Result execute(TelemetryImportRow row) {
        Optional<Computer> existing = computerRepository.findByAssetTag(row.assetTag());
        if (existing.isEmpty() && row.hostname() != null) {
            existing = computerRepository.findByHostname(row.hostname());
        }

        if (existing.isPresent()) {
            return updateExisting(existing.get(), row);
        }
        return createAndIngest(row);
    }

    private Result updateExisting(Computer computer, TelemetryImportRow row) {
        HealthSnapshot snapshot = ingestTelemetryUseCase.execute(row.toIngestCommand());

        String today = LocalDate.now().toString();
        String dedupKey = dedupKey(computer.id(), today);

        if (notificationRepository.findByDedupKey(dedupKey).isEmpty()) {
            notificationRepository.save(new AppNotification(
                UUID.randomUUID(),
                NotificationType.SISTEMA,
                Severity.INFO,
                "Telemetria atualizada · " + computer.assetTag(),
                "O equipamento " + computer.hostname() + " reportou nova telemetria hoje via importação de CSV.",
                computer.id(),
                null,
                null,
                null,
                "/inventario/" + computer.id(),
                false,
                dedupKey,
                Instant.now()
            ));
        }

        return new Result(Outcome.UPDATED, computer, snapshot);
    }

    private Result createAndIngest(TelemetryImportRow row) {
        Unit fallbackUnit = findOrCreateFallbackUnit();
        Sector fallbackSector = findOrCreateFallbackSector(fallbackUnit.id());

        CreateComputerUseCase.CreateComputerCommand command = new CreateComputerUseCase.CreateComputerCommand(
            row.assetTag(),
            row.hostname() != null ? row.hostname() : row.assetTag(),
            row.serialNumber() != null ? row.serialNumber() : "SN-DESCONHECIDO",
            row.model() != null ? row.model() : "Não informado",
            row.manufacturer() != null ? row.manufacturer() : "Não informado",
            new ComputerAssignment(
                "Não atribuído",
                "",
                fallbackSector.id(),
                fallbackUnit.id(),
                null
            ),
            new ComputerHardware(
                row.processor() != null ? row.processor() : "Não informado",
                row.ramGb() != null ? row.ramGb() : 0,
                null,
                row.storageType() != null ? row.storageType() : StorageType.SSD_NVME,
                row.storageGb() != null ? row.storageGb() : 0,
                null,
                null,
                null,
                null,
                LocalDate.now()
            ),
            new ComputerSystem(
                row.windowsVersion(),
                row.windowsBuild(),
                null,
                null,
                null,
                false
            ),
            new ComputerWarranty(null, null, null, (BigDecimal) null),
            ComputerStatus.ATIVO,
            "Cadastrado automaticamente pela importação de telemetria. Revise setor, responsável e dados de aquisição.",
            null,
            null,
            null,
            0
        );

        Computer created = createComputerUseCase.execute(command);
        log.info("Computador {} cadastrado automaticamente via importação de telemetria.", created.assetTag());

        HealthSnapshot snapshot = ingestTelemetryUseCase.execute(row.toIngestCommand());
        return new Result(Outcome.CREATED, created, snapshot);
    }

    private String dedupKey(UUID computerId, String dateStr) {
        return "TELEMETRIA_ATUALIZADA:" + computerId + ":" + dateStr;
    }

    private Unit findOrCreateFallbackUnit() {
        return unitRepository.findByCode(FALLBACK_UNIT_CODE).orElseGet(() -> {
            Instant now = Instant.now();
            return unitRepository.save(new Unit(
                UUID.randomUUID(),
                "Não Classificado",
                FALLBACK_UNIT_CODE,
                null,
                now,
                now
            ));
        });
    }

    private Sector findOrCreateFallbackSector(UUID unitId) {
        return sectorRepository.findByCode(FALLBACK_SECTOR_CODE).orElseGet(() -> {
            Instant now = Instant.now();
            return sectorRepository.save(new Sector(
                UUID.randomUUID(),
                "Não Classificado",
                FALLBACK_SECTOR_CODE,
                unitId,
                null,
                null,
                null,
                "var(--chart-1)",
                now,
                now
            ));
        });
    }
}
