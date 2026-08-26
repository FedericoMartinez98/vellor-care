package com.vellor.care.infrastructure.persistence.entity;

import com.vellor.care.domain.model.NotificationType;
import com.vellor.care.domain.model.Severity;
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

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    private NotificationType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private Severity severity;

    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "computer_id")
    private UUID computerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "computer_id", insertable = false, updatable = false)
    private ComputerEntity computer;

    @Column(name = "maintenance_id")
    private UUID maintenanceId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "maintenance_id", insertable = false, updatable = false)
    private MaintenanceEntity maintenance;

    @Column(name = "part_id")
    private UUID partId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "part_id", insertable = false, updatable = false)
    private InventoryPartEntity part;

    @Column(name = "target_user_id")
    private UUID targetUserId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_user_id", insertable = false, updatable = false)
    private UserEntity targetUser;

    @Column(name = "href", length = 255)
    private String href;

    @Column(name = "is_read", nullable = false)
    private boolean read;

    @Column(name = "dedup_key", length = 150, unique = true)
    private String dedupKey;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
