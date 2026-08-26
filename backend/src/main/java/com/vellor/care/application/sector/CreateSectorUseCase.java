package com.vellor.care.application.sector;

import com.vellor.care.domain.model.Sector;
import com.vellor.care.domain.model.Unit;
import com.vellor.care.domain.repository.SectorRepository;
import com.vellor.care.domain.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CreateSectorUseCase {

    private final SectorRepository sectorRepository;
    private final UnitRepository unitRepository;

    @Transactional
    public Sector execute(CreateSectorCommand command) {
        if (sectorRepository.findByCode(command.code()).isPresent()) {
            throw new IllegalArgumentException("Já existe um setor com o código: " + command.code());
        }

        Unit unit = unitRepository.findById(command.unitId())
            .orElseThrow(() -> new IllegalArgumentException("Unidade não encontrada: " + command.unitId()));

        UUID id = UUID.randomUUID();
        Instant now = Instant.now();

        Sector sector = new Sector(
            id,
            command.name().trim(),
            command.code().trim().toUpperCase(),
            unit.id(),
            unit.name(),
            command.manager(),
            command.costCenter(),
            command.color() != null ? command.color() : "var(--chart-1)",
            now,
            now
        );

        return sectorRepository.save(sector);
    }

    public record CreateSectorCommand(
        String name,
        String code,
        UUID unitId,
        String manager,
        String costCenter,
        String color
    ) {}
}
