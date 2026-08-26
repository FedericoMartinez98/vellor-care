package com.vellor.care.infrastructure.persistence.entity;

import com.vellor.care.domain.model.ChecklistGroup;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "maintenance_checklist_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceChecklistItemEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "maintenance_id", nullable = false)
    private UUID maintenanceId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "maintenance_id", insertable = false, updatable = false)
    private MaintenanceEntity maintenance;

    @Column(name = "item_key", nullable = false, length = 50)
    private String itemKey;

    @Column(name = "label", nullable = false, length = 150)
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(name = "checklist_group", nullable = false, length = 30)
    private ChecklistGroup group;

    @Column(name = "done", nullable = false)
    private boolean done;

    @Column(name = "measured_value", precision = 8, scale = 2)
    private BigDecimal measuredValue;

    @Column(name = "note", length = 255)
    private String note;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
