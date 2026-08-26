package com.vellor.care.application.inventory;

import com.vellor.care.domain.model.InventoryPart;
import com.vellor.care.domain.model.PartCategory;
import com.vellor.care.domain.repository.InventoryPartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UpdatePartUseCase {

    private final InventoryPartRepository partRepository;

    @Transactional
    public InventoryPart execute(UUID id, UpdatePartCommand command) {
        InventoryPart existing = partRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Peça não encontrada: " + id));

        if (!existing.sku().equalsIgnoreCase(command.sku())) {
            partRepository.findBySku(command.sku()).ifPresent(p -> {
                throw new IllegalArgumentException("Já existe outra peça com o SKU: " + command.sku());
            });
        }

        InventoryPart updated = new InventoryPart(
            existing.id(),
            command.sku().trim().toUpperCase(),
            command.name().trim(),
            command.category() != null ? command.category() : existing.category(),
            command.quantity() >= 0 ? command.quantity() : existing.quantity(),
            command.minimumQuantity() >= 0 ? command.minimumQuantity() : existing.minimumQuantity(),
            command.unit() != null ? command.unit() : existing.unit(),
            command.supplier() != null ? command.supplier() : existing.supplier(),
            command.unitValue() != null ? command.unitValue() : existing.unitValue(),
            command.location() != null ? command.location() : existing.location(),
            command.notes() != null ? command.notes() : existing.notes(),
            existing.createdAt(),
            Instant.now()
        );

        return partRepository.save(updated);
    }

    public record UpdatePartCommand(
        String sku,
        String name,
        PartCategory category,
        int quantity,
        int minimumQuantity,
        String unit,
        String supplier,
        BigDecimal unitValue,
        String location,
        String notes
    ) {}
}
