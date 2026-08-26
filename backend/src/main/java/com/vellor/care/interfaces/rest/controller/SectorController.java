package com.vellor.care.interfaces.rest.controller;

import com.vellor.care.application.sector.CreateSectorUseCase;
import com.vellor.care.application.sector.GetSectorComplianceUseCase;
import com.vellor.care.application.sector.ListSectorsUseCase;
import com.vellor.care.application.sector.UpdateSectorUseCase;
import com.vellor.care.domain.model.Sector;
import com.vellor.care.domain.repository.SectorRepository;
import com.vellor.care.interfaces.rest.dto.request.SectorCreateRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sectors")
@RequiredArgsConstructor
@Tag(name = "Setores", description = "Gestão departamental e métricas de conformidade.")
public class SectorController {

    private final ListSectorsUseCase listSectorsUseCase;
    private final CreateSectorUseCase createSectorUseCase;
    private final UpdateSectorUseCase updateSectorUseCase;
    private final GetSectorComplianceUseCase getSectorComplianceUseCase;
    private final SectorRepository sectorRepository;

    @GetMapping
    @Operation(summary = "Listar setores", description = "Retorna todos os setores cadastrados.")
    public ResponseEntity<List<Sector>> list() {
        return ResponseEntity.ok(listSectorsUseCase.executeAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consultar setor por ID", description = "Retorna dados do setor.")
    public ResponseEntity<Sector> getById(@PathVariable UUID id) {
        return listSectorsUseCase.executeById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/compliance")
    @Operation(summary = "Conformidade por setor", description = "Retorna percentual de conformidade de preventivas e contagem de computadores por setor.")
    public ResponseEntity<List<GetSectorComplianceUseCase.SectorComplianceDTO>> compliance() {
        return ResponseEntity.ok(getSectorComplianceUseCase.execute());
    }

    @PostMapping
    @Operation(summary = "Cadastrar setor", description = "Cria um novo setor corporativo.")
    public ResponseEntity<Sector> create(@Valid @RequestBody SectorCreateRequest request) {
        CreateSectorUseCase.CreateSectorCommand command = new CreateSectorUseCase.CreateSectorCommand(
            request.name(),
            request.code(),
            request.unitId(),
            request.manager(),
            request.costCenter(),
            request.color()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(createSectorUseCase.execute(command));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar setor", description = "Altera os dados cadastrais do setor.")
    public ResponseEntity<Sector> update(@PathVariable UUID id, @Valid @RequestBody SectorCreateRequest request) {
        UpdateSectorUseCase.UpdateSectorCommand command = new UpdateSectorUseCase.UpdateSectorCommand(
            request.name(),
            request.code(),
            request.unitId(),
            request.manager(),
            request.costCenter(),
            request.color()
        );
        return ResponseEntity.ok(updateSectorUseCase.execute(id, command));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir setor", description = "Remove o setor corporativo.")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        sectorRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
