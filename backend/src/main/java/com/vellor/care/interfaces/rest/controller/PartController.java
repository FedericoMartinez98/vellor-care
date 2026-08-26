package com.vellor.care.interfaces.rest.controller;

import com.vellor.care.application.inventory.CreatePartUseCase;
import com.vellor.care.application.inventory.ListPartsUseCase;
import com.vellor.care.application.inventory.MovePartUseCase;
import com.vellor.care.application.inventory.UpdatePartUseCase;
import com.vellor.care.domain.model.InventoryMovement;
import com.vellor.care.domain.model.InventoryPart;
import com.vellor.care.domain.model.PartCategory;
import com.vellor.care.domain.model.User;
import com.vellor.care.domain.repository.UserRepository;
import com.vellor.care.interfaces.rest.dto.request.PartCreateRequest;
import com.vellor.care.interfaces.rest.dto.request.PartMovementRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
@RequestMapping("/api/v1/parts")
@RequiredArgsConstructor
@Tag(name = "Estoque de Peças", description = "Catálogo de peças, reposição e razão de movimentações.")
public class PartController {

    private final ListPartsUseCase listPartsUseCase;
    private final CreatePartUseCase createPartUseCase;
    private final UpdatePartUseCase updatePartUseCase;
    private final MovePartUseCase movePartUseCase;
    private final UserRepository userRepository;

    @GetMapping
    @Operation(summary = "Listar peças do catálogo", description = "Retorna lista de peças com opção de filtrar por categoria ou estoque baixo.")
    public ResponseEntity<List<InventoryPart>> list(
        @RequestParam(required = false) PartCategory category,
        @RequestParam(required = false, defaultValue = "false") boolean lowStockOnly
    ) {
        if (lowStockOnly) {
            return ResponseEntity.ok(listPartsUseCase.executeLowStock());
        }
        if (category != null) {
            return ResponseEntity.ok(listPartsUseCase.executeByCategory(category));
        }
        return ResponseEntity.ok(listPartsUseCase.executeAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consultar peça por ID", description = "Retorna detalhes da peça cadastrada.")
    public ResponseEntity<InventoryPart> getById(@PathVariable UUID id) {
        return listPartsUseCase.executeById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Cadastrar peça", description = "Adiciona novo item ao catálogo de peças.")
    public ResponseEntity<InventoryPart> create(@Valid @RequestBody PartCreateRequest request) {
        CreatePartUseCase.CreatePartCommand command = new CreatePartUseCase.CreatePartCommand(
            request.sku(),
            request.name(),
            request.category(),
            request.quantity(),
            request.minimumQuantity(),
            request.unit(),
            request.supplier(),
            request.unitValue(),
            request.location(),
            request.notes()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(createPartUseCase.execute(command));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar peça", description = "Altera dados cadastrais ou estoque mínimo da peça.")
    public ResponseEntity<InventoryPart> update(
        @PathVariable UUID id,
        @Valid @RequestBody PartCreateRequest request
    ) {
        UpdatePartUseCase.UpdatePartCommand command = new UpdatePartUseCase.UpdatePartCommand(
            request.sku(),
            request.name(),
            request.category(),
            request.quantity(),
            request.minimumQuantity(),
            request.unit(),
            request.supplier(),
            request.unitValue(),
            request.location(),
            request.notes()
        );
        return ResponseEntity.ok(updatePartUseCase.execute(id, command));
    }

    @PostMapping("/movements")
    @Operation(summary = "Registrar movimentação de estoque", description = "Realiza entrada avulsa, ajuste de balanço ou descarte de peças.")
    public ResponseEntity<InventoryMovement> move(
        @Valid @RequestBody PartMovementRequest request,
        @AuthenticationPrincipal String userEmail
    ) {
        UUID userId = userRepository.findByEmail(userEmail)
            .map(User::id)
            .orElse(UUID.fromString("u1000000-0000-4000-8000-000000000001"));

        MovePartUseCase.MovePartCommand command = new MovePartUseCase.MovePartCommand(
            request.partId(),
            userId,
            request.type(),
            request.quantity(),
            request.reason()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(movePartUseCase.execute(command));
    }

    @GetMapping("/movements")
    @Operation(summary = "Razão de movimentações", description = "Retorna histórico auditável de entradas, saídas e consumos em preventivas.")
    public ResponseEntity<List<InventoryMovement>> listMovements(
        @RequestParam(required = false) UUID partId
    ) {
        if (partId != null) {
            return ResponseEntity.ok(listPartsUseCase.executeMovementsByPart(partId));
        }
        return ResponseEntity.ok(listPartsUseCase.executeMovements());
    }
}
