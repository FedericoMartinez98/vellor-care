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
public class CreatePartUseCase {

    private final InventoryPartRepository partRepository;

    @Transactional
    public InventoryPart execute(CreatePartCommand command) {
        if (partRepository.findBySku(command.sku()).isPresent()) {
            throw new IllegalArgumentException("Já existe uma peça com o SKU: " + command.sku());
        }

        UUID id = UUID.randomUUID();
        Instant now = Instant.now();

        InventoryPart part = new InventoryPart(
            id,
            command.sku().trim().toUpperCase(),
            command.name().trim(),
            command.category() != null ? command.category() : PartCategory.OUTRO,
            Math.max(0, command.quantity()),
            Math.max(0, command.minimumQuantity()),
            command.unit() != null && !command.unit().isBlank() ? command.unit() : "un",
            command.supplier(),
            command.unitValue() != null ? command.unitValue() : BigDecimal.ZERO,
            command.location(),
            command.notes(),
            now,
            now
        );

        return partRepository.save(part);
    }

    public record CreatePartCommand(
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
