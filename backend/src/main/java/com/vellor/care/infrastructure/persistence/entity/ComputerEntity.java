package com.vellor.care.infrastructure.persistence.entity;

import com.vellor.care.domain.model.ComputerStatus;
import com.vellor.care.domain.model.StorageType;
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
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "computers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComputerEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "asset_tag", nullable = false, length = 50, unique = true)
    private String assetTag;

    @Column(name = "hostname", nullable = false, length = 100, unique = true)
    private String hostname;

    @Column(name = "serial_number", nullable = false, length = 100, unique = true)
    private String serialNumber;

    @Column(name = "model", nullable = false, length = 100)
    private String model;

    @Column(name = "manufacturer", nullable = false, length = 100)
    private String manufacturer;

    // Atribuição
    @Column(name = "employee_name", nullable = false, length = 100)
    private String employeeName;

    @Column(name = "employee_email", length = 150)
    private String employeeEmail;

    @Column(name = "sector_id", nullable = false)
    private UUID sectorId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sector_id", insertable = false, updatable = false)
    private SectorEntity sector;

    @Column(name = "unit_id", nullable = false)
    private UUID unitId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_id", insertable = false, updatable = false)
    private UnitEntity unit;

    @Column(name = "location", length = 100)
    private String location;

    // Hardware
    @Column(name = "processor", nullable = false, length = 100)
    private String processor;

    @Column(name = "ram_gb", nullable = false)
    private int ramGb;

    @Column(name = "ram_detail", length = 100)
    private String ramDetail;

    @Enumerated(EnumType.STRING)
    @Column(name = "storage_type", nullable = false, length = 30)
    private StorageType storageType;

    @Column(name = "storage_gb", nullable = false)
    private int storageGb;

    @Column(name = "storage_detail", length = 100)
    private String storageDetail;

    @Column(name = "gpu", length = 100)
    private String gpu;

    @Column(name = "power_supply", length = 100)
    private String powerSupply;

    @Column(name = "motherboard", length = 100)
    private String motherboard;

    @Column(name = "acquisition_date")
    private LocalDate acquisitionDate;

    // Sistema
    @Column(name = "windows_version", nullable = false, length = 50)
    private String windowsVersion;

    @Column(name = "windows_build", length = 50)
    private String windowsBuild;

    @Column(name = "office_version", length = 50)
    private String officeVersion;

    @Column(name = "antivirus", length = 100)
    private String antivirus;

    @Column(name = "last_windows_update")
    private LocalDate lastWindowsUpdate;

    @Column(name = "domain_joined", nullable = false)
    private boolean domainJoined;

    // Garantia
    @Column(name = "supplier", length = 100)
    private String supplier;

    @Column(name = "invoice_number", length = 50)
    private String invoiceNumber;

    @Column(name = "warranty_until")
    private LocalDate warrantyUntil;

    @Column(name = "purchase_value", precision = 12, scale = 2)
    private BigDecimal purchaseValue;

    // Operacional
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private ComputerStatus status;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @Column(name = "qr_payload", nullable = false, length = 500)
    private String qrPayload;

    @Column(name = "last_maintenance_at")
    private Instant lastMaintenanceAt;

    @Column(name = "next_maintenance_at")
    private LocalDate nextMaintenanceAt;

    @Column(name = "maintenance_interval_days", nullable = false)
    private int maintenanceIntervalDays;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
