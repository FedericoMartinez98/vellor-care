package com.vellor.care.application.maintenance;

import com.vellor.care.domain.model.ChecklistGroup;
import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.model.ComputerStatus;
import com.vellor.care.domain.model.InventoryMovement;
import com.vellor.care.domain.model.InventoryPart;
import com.vellor.care.domain.model.Maintenance;
import com.vellor.care.domain.model.MaintenanceChecklistItem;
import com.vellor.care.domain.model.MaintenancePartUsage;
import com.vellor.care.domain.model.MaintenancePhoto;
import com.vellor.care.domain.model.MaintenanceStatus;
import com.vellor.care.domain.model.MovementType;
import com.vellor.care.domain.model.PhotoMoment;
import com.vellor.care.domain.repository.ComputerRepository;
import com.vellor.care.domain.repository.InventoryMovementRepository;
import com.vellor.care.domain.repository.InventoryPartRepository;
import com.vellor.care.domain.repository.MaintenanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CompleteMaintenanceUseCase {

    private final MaintenanceRepository maintenanceRepository;
    private final ComputerRepository computerRepository;
    private final InventoryPartRepository partRepository;
    private final InventoryMovementRepository movementRepository;

    @Transactional
    public Maintenance execute(UUID maintenanceId, CompleteMaintenanceCommand command) {
        Maintenance maintenance = maintenanceRepository.findById(maintenanceId)
            .orElseThrow(() -> new IllegalArgumentException("Manutenção não encontrada: " + maintenanceId));

        if (maintenance.status() == MaintenanceStatus.CONCLUIDA) {
            throw new IllegalStateException("Esta manutenção já foi concluída anteriormente.");
        }

        Instant now = Instant.now();

        // 1. Processa Checklist
        List<MaintenanceChecklistItem> checklistItems = new ArrayList<>();
        if (command.checklist() != null) {
            int order = 0;
            for (ChecklistItemInput in : command.checklist()) {
                checklistItems.add(new MaintenanceChecklistItem(
                    UUID.randomUUID(),
                    in.itemKey(),
                    in.label(),
                    in.group(),
                    in.done(),
                    in.measuredValue(),
                    in.note(),
                    order++
                ));
            }
        }

        // 2. Processa Baixa de Peças no Estoque
        List<MaintenancePartUsage> partsUsed = new ArrayList<>();
        if (command.parts() != null) {
            for (PartUsageInput pIn : command.parts()) {
                InventoryPart part = partRepository.findById(pIn.partId())
                    .orElseThrow(() -> new IllegalArgumentException("Peça não encontrada no catálogo: " + pIn.partId()));

                int newQuantity = part.quantity() - pIn.quantity();
                if (newQuantity < 0) {
                    throw new IllegalStateException("Saldo insuficiente em estoque para a peça " + part.name() + ". Saldo atual: " + part.quantity());
                }

                // Atualiza estoque da peça
                InventoryPart updatedPart = new InventoryPart(
                    part.id(),
                    part.sku(),
                    part.name(),
                    part.category(),
                    newQuantity,
                    part.minimumQuantity(),
                    part.unit(),
                    part.supplier(),
                    part.unitValue(),
                    part.location(),
                    part.notes(),
                    part.createdAt(),
                    now
                );
                partRepository.save(updatedPart);

                // Registra movimentação de saída
                InventoryMovement movement = new InventoryMovement(
                    UUID.randomUUID(),
                    part.id(),
                    part.name(),
                    MovementType.SAIDA,
                    pIn.quantity(),
                    newQuantity,
                    maintenance.id(),
                    maintenance.assetTag(),
                    maintenance.technicianId(),
                    maintenance.technicianName(),
                    "Consumo na OS " + maintenance.assetTag(),
                    now
                );
                movementRepository.save(movement);

                partsUsed.add(new MaintenancePartUsage(
                    UUID.randomUUID(),
                    part.id(),
                    part.name(),
                    pIn.quantity(),
                    part.unitValue()
                ));
            }
        }

        // 3. Processa Fotos
        List<MaintenancePhoto> photos = new ArrayList<>();
        if (command.photosBefore() != null) {
            for (String url : command.photosBefore()) {
                photos.add(new MaintenancePhoto(UUID.randomUUID(), url, "Antes da manutenção", PhotoMoment.ANTES, now));
            }
        }
        if (command.photosAfter() != null) {
            for (String url : command.photosAfter()) {
                photos.add(new MaintenancePhoto(UUID.randomUUID(), url, "Após a manutenção", PhotoMoment.DEPOIS, now));
            }
        }

        // 4. Salva a Manutenção Concluída
        Maintenance completed = new Maintenance(
            maintenance.id(),
            maintenance.computerId(),
            maintenance.assetTag(),
            maintenance.hostname(),
            maintenance.sectorId(),
            maintenance.technicianId(),
            maintenance.technicianName(),
            maintenance.type(),
            MaintenanceStatus.CONCLUIDA,
            maintenance.priority(),
            maintenance.scheduledFor(),
            maintenance.startedAt() != null ? maintenance.startedAt() : now,
            now,
            command.durationMinutes() > 0 ? command.durationMinutes() : 45,
            checklistItems,
            partsUsed,
            photos,
            command.notes() != null ? command.notes() : maintenance.notes(),
            command.signatureDataUrl(),
            maintenance.createdAt(),
            now
        );

        Maintenance saved = maintenanceRepository.save(completed);

        // 5. Atualiza o Computador (Ciclo de 90 dias e Status ATIVO)
        computerRepository.findById(maintenance.computerId()).ifPresent(comp -> {
            LocalDate nextMaint = LocalDate.now().plusDays(comp.maintenanceIntervalDays() > 0 ? comp.maintenanceIntervalDays() : 90);
            Computer updatedComp = new Computer(
                comp.id(),
                comp.assetTag(),
                comp.hostname(),
                comp.serialNumber(),
                comp.model(),
                comp.manufacturer(),
                comp.assignment(),
                comp.hardware(),
                comp.system(),
                comp.warranty(),
                ComputerStatus.ATIVO,
                comp.notes(),
                comp.photoUrl(),
                comp.qrPayload(),
                now,
                nextMaint,
                comp.maintenanceIntervalDays(),
                comp.latestHealth(),
                comp.createdAt(),
                now
            );
            computerRepository.save(updatedComp);
        });

        return saved;
    }

    public record CompleteMaintenanceCommand(
        List<ChecklistItemInput> checklist,
        List<PartUsageInput> parts,
        List<String> photosBefore,
        List<String> photosAfter,
        int durationMinutes,
        String notes,
        String signatureDataUrl
    ) {}

    public record ChecklistItemInput(
        String itemKey,
        String label,
        ChecklistGroup group,
        boolean done,
        BigDecimal measuredValue,
        String note
    ) {}

    public record PartUsageInput(
        UUID partId,
        int quantity
    ) {}
}
