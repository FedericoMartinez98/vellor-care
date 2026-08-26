package com.vellor.care.domain.service;

import com.vellor.care.domain.model.AppNotification;
import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.model.ComputerStatus;
import com.vellor.care.domain.model.HealthSnapshot;
import com.vellor.care.domain.model.InventoryPart;
import com.vellor.care.domain.model.NotificationType;
import com.vellor.care.domain.model.Severity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class AlertEvaluationService {

    private final BigDecimal criticalSsdHealth;
    private final BigDecimal criticalCpuTemp;
    private final int warningDays;
    private final int noMaintenanceDaysLimit;

    public AlertEvaluationService(
        BigDecimal criticalSsdHealth,
        BigDecimal criticalCpuTemp,
        int warningDays,
        int noMaintenanceDaysLimit
    ) {
        this.criticalSsdHealth = criticalSsdHealth;
        this.criticalCpuTemp = criticalCpuTemp;
        this.warningDays = warningDays;
        this.noMaintenanceDaysLimit = noMaintenanceDaysLimit;
    }

    public List<AppNotification> evaluateComputerAlerts(Computer computer, LocalDate today) {
        List<AppNotification> alerts = new ArrayList<>();
        if (computer.status() == ComputerStatus.DESATIVADO) {
            return alerts;
        }

        String todayStr = today.toString();
        UUID computerId = computer.id();

        // 1. Alertas de Manutenção Preventiva
        if (computer.nextMaintenanceAt() != null) {
            long daysUntil = ChronoUnit.DAYS.between(today, computer.nextMaintenanceAt());
            if (daysUntil < 0) {
                alerts.add(new AppNotification(
                    UUID.randomUUID(),
                    NotificationType.PREVENTIVA_ATRASADA,
                    Severity.CRITICO,
                    "Preventiva Atrasada · " + computer.assetTag(),
                    "A manutenção de " + computer.hostname() + " venceu em " + computer.nextMaintenanceAt() + ".",
                    computerId,
                    null,
                    null,
                    null,
                    "/inventario/" + computerId,
                    false,
                    "PREVENTIVA_ATRASADA:" + computerId + ":" + todayStr,
                    Instant.now()
                ));
            } else if (daysUntil == 0) {
                alerts.add(new AppNotification(
                    UUID.randomUUID(),
                    NotificationType.PREVENTIVA_HOJE,
                    Severity.AVISO,
                    "Preventiva Hoje · " + computer.assetTag(),
                    "A manutenção de " + computer.hostname() + " está programada para hoje.",
                    computerId,
                    null,
                    null,
                    null,
                    "/inventario/" + computerId,
                    false,
                    "PREVENTIVA_HOJE:" + computerId + ":" + todayStr,
                    Instant.now()
                ));
            } else if (daysUntil <= warningDays) {
                alerts.add(new AppNotification(
                    UUID.randomUUID(),
                    NotificationType.PREVENTIVA_7_DIAS,
                    Severity.INFO,
                    "Preventiva Próxima · " + computer.assetTag(),
                    "A manutenção de " + computer.hostname() + " vence em " + daysUntil + " dias.",
                    computerId,
                    null,
                    null,
                    null,
                    "/inventario/" + computerId,
                    false,
                    "PREVENTIVA_7_DIAS:" + computerId + ":" + todayStr,
                    Instant.now()
                ));
            }
        }

        // 2. Alertas de Telemetria
        HealthSnapshot health = computer.latestHealth();
        if (health != null) {
            if (health.ssdHealthPercent() != null && health.ssdHealthPercent().compareTo(criticalSsdHealth) < 0) {
                alerts.add(new AppNotification(
                    UUID.randomUUID(),
                    NotificationType.SSD_SAUDE_BAIXA,
                    Severity.CRITICO,
                    "Saúde do SSD Crítica · " + computer.assetTag(),
                    "SMART reporta saúde de apenas " + health.ssdHealthPercent() + "% no disco de " + computer.hostname() + ".",
                    computerId,
                    null,
                    null,
                    null,
                    "/inventario/" + computerId + "?aba=saude",
                    false,
                    "SSD_SAUDE_BAIXA:" + computerId + ":" + todayStr,
                    Instant.now()
                ));
            }

            if (health.cpuTempC() != null && health.cpuTempC().compareTo(criticalCpuTemp) >= 0) {
                alerts.add(new AppNotification(
                    UUID.randomUUID(),
                    NotificationType.TEMPERATURA_ALTA,
                    Severity.CRITICO,
                    "Superaquecimento de CPU · " + computer.assetTag(),
                    "CPU de " + computer.hostname() + " atingiu " + health.cpuTempC() + "°C.",
                    computerId,
                    null,
                    null,
                    null,
                    "/inventario/" + computerId + "?aba=saude",
                    false,
                    "TEMPERATURA_ALTA:" + computerId + ":" + todayStr,
                    Instant.now()
                ));
            }
        }

        return alerts;
    }

    public List<AppNotification> evaluatePartAlerts(InventoryPart part, LocalDate today) {
        List<AppNotification> alerts = new ArrayList<>();
        if (part.quantity() <= part.minimumQuantity()) {
            alerts.add(new AppNotification(
                UUID.randomUUID(),
                NotificationType.ESTOQUE_MINIMO,
                Severity.AVISO,
                "Estoque Mínimo Atingido · " + part.sku(),
                "A peça " + part.name() + " está com saldo de " + part.quantity() + " " + part.unit() + " (mínimo: " + part.minimumQuantity() + ").",
                null,
                null,
                part.id(),
                null,
                "/estoque",
                false,
                "ESTOQUE_MINIMO:" + part.id() + ":" + today.toString(),
                Instant.now()
            ));
        }
        return alerts;
    }
}
