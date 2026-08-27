package com.vellor.care.infrastructure.persistence.mapper;

import com.vellor.care.domain.model.InventoryMovement;
import com.vellor.care.domain.model.InventoryPart;
import com.vellor.care.infrastructure.persistence.entity.InventoryMovementEntity;
import com.vellor.care.infrastructure.persistence.entity.InventoryPartEntity;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class PartMapper {

    public InventoryPart toDomain(InventoryPartEntity entity) {
        if (entity == null) return null;
        return new InventoryPart(
            entity.getId(),
            entity.getSku(),
            entity.getName(),
            entity.getCategory(),
            entity.getQuantity(),
            entity.getMinimumQuantity(),
            entity.getUnit(),
            entity.getSupplier(),
            entity.getUnitValue(),
            entity.getLocation(),
            entity.getNotes(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    public InventoryPartEntity toEntity(InventoryPart domain) {
        if (domain == null) return null;
        Instant now = Instant.now();
        return InventoryPartEntity.builder()
            .id(domain.id())
            .sku(domain.sku())
            .name(domain.name())
            .category(domain.category())
            .quantity(domain.quantity())
            .minimumQuantity(domain.minimumQuantity())
            .unit(domain.unit())
            .supplier(domain.supplier())
            .unitValue(domain.unitValue())
            .location(domain.location())
            .notes(domain.notes())
            .createdAt(domain.createdAt() != null ? domain.createdAt() : now)
            .updatedAt(domain.updatedAt() != null ? domain.updatedAt() : now)
            .build();
    }

    public InventoryMovement toDomain(InventoryMovementEntity entity) {
        if (entity == null) return null;
        // Prefere as colunas desnormalizadas (o historico congela o nome no
        // momento do movimento); cai para a associacao lazy so em registro
        // antigo, gravado antes dessas colunas serem mapeadas.
        String partName = entity.getPartName() != null
            ? entity.getPartName()
            : (entity.getPart() != null ? entity.getPart().getName() : "");
        String userName = entity.getUserName() != null
            ? entity.getUserName()
            : (entity.getUser() != null ? entity.getUser().getName() : "");

        return new InventoryMovement(
            entity.getId(),
            entity.getPartId(),
            partName,
            entity.getType(),
            entity.getQuantity(),
            entity.getBalanceAfter(),
            entity.getMaintenanceId(),
            entity.getComputerAssetTag(),
            entity.getUserId(),
            userName,
            entity.getReason(),
            entity.getCreatedAt()
        );
    }

    public InventoryMovementEntity toEntity(InventoryMovement domain) {
        if (domain == null) return null;
        return InventoryMovementEntity.builder()
            .id(domain.id())
            .partId(domain.partId())
            .partName(domain.partName())
            .type(domain.type())
            .quantity(domain.quantity())
            .balanceAfter(domain.balanceAfter())
            .maintenanceId(domain.maintenanceId())
            .computerAssetTag(domain.computerAssetTag())
            .userId(domain.userId())
            .userName(domain.userName())
            .reason(domain.reason())
            .createdAt(domain.createdAt() != null ? domain.createdAt() : Instant.now())
            .build();
    }
}
