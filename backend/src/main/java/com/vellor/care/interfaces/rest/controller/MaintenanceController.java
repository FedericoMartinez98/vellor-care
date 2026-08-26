package com.vellor.care.interfaces.rest.controller;

import com.vellor.care.application.maintenance.CancelMaintenanceUseCase;
import com.vellor.care.application.maintenance.CompleteMaintenanceUseCase;
import com.vellor.care.application.maintenance.CreateMaintenanceUseCase;
import com.vellor.care.application.maintenance.GetMaintenanceUseCase;
import com.vellor.care.application.maintenance.ListMaintenancesUseCase;
import com.vellor.care.application.maintenance.RescheduleMaintenanceUseCase;
import com.vellor.care.application.maintenance.StartMaintenanceUseCase;
import com.vellor.care.domain.model.Maintenance;
import com.vellor.care.domain.model.MaintenanceStatus;
import com.vellor.care.domain.model.MaintenanceType;
import com.vellor.care.interfaces.rest.dto.request.CompleteMaintenanceRequest;
import com.vellor.care.interfaces.rest.dto.request.MaintenanceCreateRequest;
import com.vellor.care.interfaces.rest.dto.request.RescheduleRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/maintenances")
@RequiredArgsConstructor
@Tag(name = "Manutenções e Preventivas", description = "Gestão de ordens de serviço, execução de checklists e reagendamento.")
public class MaintenanceController {

    private final ListMaintenancesUseCase listMaintenancesUseCase;
    private final GetMaintenanceUseCase getMaintenanceUseCase;
    private final CreateMaintenanceUseCase createMaintenanceUseCase;
    private final StartMaintenanceUseCase startMaintenanceUseCase;
    private final CompleteMaintenanceUseCase completeMaintenanceUseCase;
    private final RescheduleMaintenanceUseCase rescheduleMaintenanceUseCase;
    private final CancelMaintenanceUseCase cancelMaintenanceUseCase;

    @GetMapping
    @Operation(summary = "Listar manutenções", description = "Retorna lista de manutenções com filtros por computador, setor, técnico, status ou intervalo de datas.")
    public ResponseEntity<List<Maintenance>> list(
        @RequestParam(required = false) UUID computerId,
        @RequestParam(required = false) UUID sectorId,
        @RequestParam(required = false) UUID technicianId,
        @RequestParam(required = false) MaintenanceStatus status,
        @RequestParam(required = false) MaintenanceType type,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        if (computerId != null) {
            return ResponseEntity.ok(listMaintenancesUseCase.executeByComputer(computerId));
        }
        if (sectorId != null) {
            return ResponseEntity.ok(listMaintenancesUseCase.executeBySector(sectorId));
        }
        if (technicianId != null) {
            return ResponseEntity.ok(listMaintenancesUseCase.executeByTechnician(technicianId));
        }
        if (status != null) {
            return ResponseEntity.ok(listMaintenancesUseCase.executeByStatus(status));
        }
        if (type != null) {
            return ResponseEntity.ok(listMaintenancesUseCase.executeByType(type));
        }
        if (from != null && to != null) {
            return ResponseEntity.ok(listMaintenancesUseCase.executeBetweenDates(from, to));
        }
        return ResponseEntity.ok(listMaintenancesUseCase.executeAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consultar manutenção por ID", description = "Retorna os detalhes completos da OS, incluindo checklist e fotos.")
    public ResponseEntity<Maintenance> getById(@PathVariable UUID id) {
        return getMaintenanceUseCase.execute(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Agendar manutenção", description = "Cria uma nova ordem de serviço no cronograma.")
    public ResponseEntity<Maintenance> create(@Valid @RequestBody MaintenanceCreateRequest request) {
        CreateMaintenanceUseCase.CreateMaintenanceCommand command = new CreateMaintenanceUseCase.CreateMaintenanceCommand(
            request.computerId(),
            request.technicianId(),
            request.type(),
            request.priority(),
            request.scheduledFor(),
            request.notes()
        );
        Maintenance created = createMaintenanceUseCase.execute(command);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/{id}/start")
    @Operation(summary = "Iniciar atendimento", description = "Altera o status da OS para EM_ANDAMENTO e o computador para EM_MANUTENCAO.")
    public ResponseEntity<Maintenance> start(@PathVariable UUID id) {
        return ResponseEntity.ok(startMaintenanceUseCase.execute(id));
    }

    @PostMapping("/{id}/complete")
    @Operation(summary = "Concluir manutenção", description = "Finaliza a preventiva com checklist, baixa de peças, fotos e assinatura do técnico.")
    public ResponseEntity<Maintenance> complete(
        @PathVariable UUID id,
        @Valid @RequestBody CompleteMaintenanceRequest request
    ) {
        CompleteMaintenanceUseCase.CompleteMaintenanceCommand command = new CompleteMaintenanceUseCase.CompleteMaintenanceCommand(
            request.checklist(),
            request.parts(),
            request.photosBefore(),
            request.photosAfter(),
            request.durationMinutes(),
            request.notes(),
            request.signatureDataUrl()
        );

        Maintenance completed = completeMaintenanceUseCase.execute(id, command);
        return ResponseEntity.ok(completed);
    }

    @PutMapping("/{id}/reschedule")
    @Operation(summary = "Reagendar manutenção", description = "Altera a data prevista para a realização da preventiva.")
    public ResponseEntity<Maintenance> reschedule(
        @PathVariable UUID id,
        @Valid @RequestBody RescheduleRequest request
    ) {
        Maintenance rescheduled = rescheduleMaintenanceUseCase.execute(id, request.newScheduledFor());
        return ResponseEntity.ok(rescheduled);
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancelar manutenção", description = "Cancela a OS com justificativa.")
    public ResponseEntity<Maintenance> cancel(
        @PathVariable UUID id,
        @RequestParam(required = false, defaultValue = "Cancelado pelo usuário") String reason
    ) {
        return ResponseEntity.ok(cancelMaintenanceUseCase.execute(id, reason));
    }
}
