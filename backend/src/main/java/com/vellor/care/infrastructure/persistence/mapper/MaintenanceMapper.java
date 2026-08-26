package com.vellor.care.infrastructure.persistence.mapper;

import com.vellor.care.domain.model.Maintenance;
import com.vellor.care.domain.model.MaintenanceChecklistItem;
import com.vellor.care.domain.model.MaintenancePartUsage;
import com.vellor.care.domain.model.MaintenancePhoto;
import com.vellor.care.infrastructure.persistence.entity.MaintenanceChecklistItemEntity;
import com.vellor.care.infrastructure.persistence.entity.MaintenanceEntity;
import com.vellor.care.infrastructure.persistence.entity.MaintenancePartEntity;
import com.vellor.care.infrastructure.persistence.entity.MaintenancePhotoEntity;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class MaintenanceMapper {

    public Maintenance toDomain(MaintenanceEntity entity) {
        if (entity == null) return null;

        String assetTag = entity.getComputer() != null ? entity.getComputer().getAssetTag() : "";
        String hostname = entity.getComputer() != null ? entity.getComputer().getHostname() : "";
        var sectorId = entity.getComputer() != null ? entity.getComputer().getSectorId() : null;
        String techName = entity.getTechnician() != null ? entity.getTechnician().getName() : "";

        List<MaintenanceChecklistItem> items = entity.getChecklistItems() != null
            ? entity.getChecklistItems().stream()
                .map(i -> new MaintenanceChecklistItem(i.getId(), i.getItemKey(), i.getLabel(), i.getGroup(), i.isDone(), i.getMeasuredValue(), i.getNote(), i.getSortOrder()))
                .toList()
            : Collections.emptyList();

        List<MaintenancePartUsage> parts = entity.getParts() != null
            ? entity.getParts().stream()
                .map(p -> new MaintenancePartUsage(p.getId(), p.getPartId(), p.getPart() != null ? p.getPart().getName() : "", p.getQuantity(), p.getUnitCost()))
                .toList()
            : Collections.emptyList();

        List<MaintenancePhoto> photos = entity.getPhotos() != null
            ? entity.getPhotos().stream()
                .map(ph -> new MaintenancePhoto(ph.getId(), ph.getUrl(), ph.getCaption(), ph.getMoment(), ph.getCreatedAt()))
                .toList()
            : Collections.emptyList();

        return new Maintenance(
            entity.getId(),
            entity.getComputerId(),
            assetTag,
            hostname,
            sectorId,
            entity.getTechnicianId(),
            techName,
            entity.getType(),
            entity.getStatus(),
            entity.getPriority(),
            entity.getScheduledFor(),
            entity.getStartedAt(),
            entity.getFinishedAt(),
            entity.getDurationMinutes(),
            items,
            parts,
            photos,
            entity.getNotes(),
            entity.getSignatureDataUrl(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    public MaintenanceEntity toEntity(Maintenance domain) {
        if (domain == null) return null;
        Instant now = Instant.now();

        MaintenanceEntity entity = MaintenanceEntity.builder()
            .id(domain.id())
            .computerId(domain.computerId())
            .technicianId(domain.technicianId())
            .type(domain.type())
            .status(domain.status())
            .priority(domain.priority())
            .scheduledFor(domain.scheduledFor())
            .startedAt(domain.startedAt())
            .finishedAt(domain.finishedAt())
            .durationMinutes(domain.durationMinutes())
            .notes(domain.notes())
            .signatureDataUrl(domain.signatureDataUrl())
            .createdAt(domain.createdAt() != null ? domain.createdAt() : now)
            .updatedAt(domain.updatedAt() != null ? domain.updatedAt() : now)
            .build();

        if (domain.checklist() != null) {
            List<MaintenanceChecklistItemEntity> items = domain.checklist().stream()
                .map(i -> MaintenanceChecklistItemEntity.builder()
                    .id(i.id())
                    .maintenanceId(domain.id())
                    .maintenance(entity)
                    .itemKey(i.itemKey())
                    .label(i.label())
                    .group(i.group())
                    .done(i.done())
                    .measuredValue(i.measuredValue())
                    .note(i.note())
                    .sortOrder(i.sortOrder())
                    .build())
                .toList();
            entity.setChecklistItems(new ArrayList<>(items));
        }

        if (domain.parts() != null) {
            List<MaintenancePartEntity> partEntities = domain.parts().stream()
                .map(p -> MaintenancePartEntity.builder()
                    .id(p.id())
                    .maintenanceId(domain.id())
                    .maintenance(entity)
                    .partId(p.partId())
                    .quantity(p.quantity())
                    .unitCost(p.unitCost())
                    .build())
                .toList();
            entity.setParts(new ArrayList<>(partEntities));
        }

        if (domain.photos() != null) {
            List<MaintenancePhotoEntity> photoEntities = domain.photos().stream()
                .map(ph -> MaintenancePhotoEntity.builder()
                    .id(ph.id())
                    .maintenanceId(domain.id())
                    .maintenance(entity)
                    .url(ph.url())
                    .caption(ph.caption())
                    .moment(ph.moment())
                    .createdAt(ph.createdAt() != null ? ph.createdAt() : now)
                    .build())
                .toList();
            entity.setPhotos(new ArrayList<>(photoEntities));
        }

        return entity;
    }
}
