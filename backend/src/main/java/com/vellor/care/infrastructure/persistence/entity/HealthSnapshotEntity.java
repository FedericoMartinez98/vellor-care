package com.vellor.care.infrastructure.persistence.entity;

import com.vellor.care.domain.model.HealthSource;
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
import java.util.UUID;

@Entity
@Table(name = "health_snapshots")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HealthSnapshotEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "computer_id", nullable = false)
    private UUID computerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "computer_id", insertable = false, updatable = false)
    private ComputerEntity computer;

    @Column(name = "collected_at", nullable = false)
    private Instant collectedAt;

    @Column(name = "ssd_health_percent", precision = 5, scale = 2)
    private BigDecimal ssdHealthPercent;

    @Column(name = "ssd_power_on_hours")
    private Integer ssdPowerOnHours;

    @Column(name = "cpu_temp_c", precision = 5, scale = 2)
    private BigDecimal cpuTempC;

    @Column(name = "gpu_temp_c", precision = 5, scale = 2)
    private BigDecimal gpuTempC;

    @Column(name = "ssd_temp_c", precision = 5, scale = 2)
    private BigDecimal ssdTempC;

    @Column(name = "cpu_usage_percent", precision = 5, scale = 2)
    private BigDecimal cpuUsagePercent;

    @Column(name = "ram_usage_percent", precision = 5, scale = 2)
    private BigDecimal ramUsagePercent;

    @Column(name = "disk_free_percent", precision = 5, scale = 2)
    private BigDecimal diskFreePercent;

    @Column(name = "disk_free_gb", precision = 8, scale = 2)
    private BigDecimal diskFreeGb;

    @Column(name = "uptime_hours", precision = 8, scale = 2)
    private BigDecimal uptimeHours;

    @Column(name = "last_boot_at")
    private Instant lastBootAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 20)
    private HealthSource source;
}
