package com.vellor.care.infrastructure.persistence.entity;

import com.vellor.care.domain.model.PhotoMoment;
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
@Table(name = "maintenance_photos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenancePhotoEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "maintenance_id", nullable = false)
    private UUID maintenanceId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "maintenance_id", insertable = false, updatable = false)
    private MaintenanceEntity maintenance;

    // TEXT (nao VARCHAR): a foto chega como data-URL base64, igual a assinatura
    // do tecnico em MaintenanceEntity.signatureDataUrl.
    @Column(name = "url", nullable = false, columnDefinition = "TEXT")
    private String url;

    @Column(name = "caption", length = 255)
    private String caption;

    @Enumerated(EnumType.STRING)
    @Column(name = "moment", nullable = false, length = 20)
    private PhotoMoment moment;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
