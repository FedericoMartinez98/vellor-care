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
public class UpdateSectorUseCase {

    private final SectorRepository sectorRepository;
    private final UnitRepository unitRepository;

    @Transactional
    public Sector execute(UUID id, UpdateSectorCommand command) {
        Sector existing = sectorRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Setor não encontrado: " + id));

        if (!existing.code().equalsIgnoreCase(command.code())) {
            sectorRepository.findByCode(command.code()).ifPresent(s -> {
                throw new IllegalArgumentException("Já existe outro setor com o código: " + command.code());
            });
        }

        Unit unit = unitRepository.findById(command.unitId())
            .orElseThrow(() -> new IllegalArgumentException("Unidade não encontrada: " + command.unitId()));

        Sector updated = new Sector(
            existing.id(),
            command.name().trim(),
            command.code().trim().toUpperCase(),
            unit.id(),
            unit.name(),
            command.manager(),
            command.costCenter(),
            command.color() != null ? command.color() : existing.color(),
            existing.createdAt(),
            Instant.now()
        );

        return sectorRepository.save(updated);
    }

    public record UpdateSectorCommand(
        String name,
        String code,
        UUID unitId,
        String manager,
        String costCenter,
        String color
    ) {}
}
