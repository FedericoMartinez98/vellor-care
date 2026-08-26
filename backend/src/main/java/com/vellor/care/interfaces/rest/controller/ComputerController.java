package com.vellor.care.interfaces.rest.controller;

import com.vellor.care.application.computer.CreateComputerUseCase;
import com.vellor.care.application.computer.DeleteComputerUseCase;
import com.vellor.care.application.computer.GetComputerUseCase;
import com.vellor.care.application.computer.ListComputersUseCase;
import com.vellor.care.application.computer.RecordHealthSnapshotUseCase;
import com.vellor.care.application.computer.UpdateComputerUseCase;
import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.model.ComputerStatus;
import com.vellor.care.domain.model.HealthSnapshot;
import com.vellor.care.domain.repository.HealthSnapshotRepository;
import com.vellor.care.interfaces.rest.dto.request.ComputerCreateRequest;
import com.vellor.care.interfaces.rest.dto.request.ComputerUpdateRequest;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/computers")
@RequiredArgsConstructor
@Tag(name = "Inventário de Computadores", description = "CRUD de ativos, histórico de telemetria e busca.")
public class ComputerController {

    private final ListComputersUseCase listComputersUseCase;
    private final GetComputerUseCase getComputerUseCase;
    private final CreateComputerUseCase createComputerUseCase;
    private final UpdateComputerUseCase updateComputerUseCase;
    private final DeleteComputerUseCase deleteComputerUseCase;
    private final RecordHealthSnapshotUseCase recordHealthSnapshotUseCase;
    private final HealthSnapshotRepository healthSnapshotRepository;

    @GetMapping
    @Operation(summary = "Listar computadores", description = "Retorna lista de computadores com suporte a filtro por setor, status ou busca textual.")
    public ResponseEntity<List<Computer>> list(
        @RequestParam(required = false) UUID sectorId,
        @RequestParam(required = false) ComputerStatus status,
        @RequestParam(required = false) String q
    ) {
        if (q != null && !q.isBlank()) {
            return ResponseEntity.ok(listComputersUseCase.executeSearch(q));
        }
        if (sectorId != null) {
            return ResponseEntity.ok(listComputersUseCase.executeBySector(sectorId));
        }
        if (status != null) {
            return ResponseEntity.ok(listComputersUseCase.executeByStatus(status));
        }
        return ResponseEntity.ok(listComputersUseCase.executeAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consultar computador por ID", description = "Retorna ficha detalhada do equipamento.")
    public ResponseEntity<Computer> getById(@PathVariable UUID id) {
        return getComputerUseCase.execute(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/asset-tag/{assetTag}")
    @Operation(summary = "Consultar computador por patrimônio", description = "Localiza o ativo através da etiqueta de patrimônio.")
    public ResponseEntity<Computer> getByAssetTag(@PathVariable String assetTag) {
        return getComputerUseCase.executeByAssetTag(assetTag)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Cadastrar computador", description = "Cria um novo ativo no inventário com QR Code patrimonial.")
    public ResponseEntity<Computer> create(@Valid @RequestBody ComputerCreateRequest request) {
        CreateComputerUseCase.CreateComputerCommand command = new CreateComputerUseCase.CreateComputerCommand(
            request.assetTag(),
            request.hostname(),
            request.serialNumber(),
            request.model(),
            request.manufacturer(),
            request.assignment(),
            request.hardware(),
            request.system(),
            request.warranty(),
            request.status(),
            request.notes(),
            request.photoUrl(),
            request.qrPayload(),
            request.nextMaintenanceAt(),
            request.maintenanceIntervalDays()
        );

        Computer created = createComputerUseCase.execute(command);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar computador", description = "Atualiza configurações de hardware, atribuição ou sistema do computador.")
    public ResponseEntity<Computer> update(@PathVariable UUID id, @Valid @RequestBody ComputerUpdateRequest request) {
        UpdateComputerUseCase.UpdateComputerCommand command = new UpdateComputerUseCase.UpdateComputerCommand(
            request.assetTag(),
            request.hostname(),
            request.serialNumber(),
            request.model(),
            request.manufacturer(),
            request.assignment(),
            request.hardware(),
            request.system(),
            request.warranty(),
            request.status(),
            request.notes(),
            request.photoUrl(),
            request.nextMaintenanceAt(),
            request.maintenanceIntervalDays()
        );

        Computer updated = updateComputerUseCase.execute(id, command);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir computador", description = "Remove o ativo do inventário.")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        deleteComputerUseCase.execute(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/health-history")
    @Operation(summary = "Histórico de telemetria", description = "Retorna coletas de SMART e temperaturas anteriores do computador.")
    public ResponseEntity<List<HealthSnapshot>> healthHistory(
        @PathVariable UUID id,
        @RequestParam(defaultValue = "20") int limit
    ) {
        return ResponseEntity.ok(healthSnapshotRepository.findHistoryByComputerId(id, limit));
    }
}
