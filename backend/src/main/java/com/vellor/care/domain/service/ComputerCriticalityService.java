package com.vellor.care.domain.service;

import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.model.ComputerStatus;
import com.vellor.care.domain.model.HealthSnapshot;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

public class ComputerCriticalityService {

    private final BigDecimal criticalSsdHealth;
    private final BigDecimal criticalCpuTemp;
    private final int noMaintenanceDaysLimit;

    public ComputerCriticalityService(BigDecimal criticalSsdHealth, BigDecimal criticalCpuTemp, int noMaintenanceDaysLimit) {
        this.criticalSsdHealth = criticalSsdHealth;
        this.criticalCpuTemp = criticalCpuTemp;
        this.noMaintenanceDaysLimit = noMaintenanceDaysLimit;
    }

    public boolean isCritical(Computer computer, LocalDate today) {
        return !getCriticalReasons(computer, today).isEmpty();
    }

    public List<String> getCriticalReasons(Computer computer, LocalDate today) {
        List<String> reasons = new ArrayList<>();

        if (computer.status() == ComputerStatus.DESATIVADO) {
            return reasons;
        }

        HealthSnapshot health = computer.latestHealth();
        if (health != null) {
            if (health.ssdHealthPercent() != null && health.ssdHealthPercent().compareTo(criticalSsdHealth) < 0) {
                reasons.add("Saúde do SSD em " + health.ssdHealthPercent() + "% (crítico abaixo de " + criticalSsdHealth + "%)");
            }
            if (health.cpuTempC() != null && health.cpuTempC().compareTo(criticalCpuTemp) >= 0) {
                reasons.add("Temperatura da CPU em " + health.cpuTempC() + "°C (crítico acima de " + criticalCpuTemp + "°C)");
            }
            if (health.ssdTempC() != null && health.ssdTempC().compareTo(BigDecimal.valueOf(70)) >= 0) {
                reasons.add("Temperatura do SSD em " + health.ssdTempC() + "°C (superaquecimento)");
            }
        }

        if (computer.lastMaintenanceAt() != null) {
            LocalDate lastDate = computer.lastMaintenanceAt().atZone(ZoneOffset.UTC).toLocalDate();
            long daysSinceLast = ChronoUnit.DAYS.between(lastDate, today);
            if (daysSinceLast > noMaintenanceDaysLimit) {
                reasons.add("Sem manutenção preventiva há mais de " + noMaintenanceDaysLimit + " dias (" + daysSinceLast + " dias decorridos)");
            }
        } else if (computer.createdAt() != null) {
            LocalDate createdDate = computer.createdAt().atZone(ZoneOffset.UTC).toLocalDate();
            long daysSinceCreated = ChronoUnit.DAYS.between(createdDate, today);
            if (daysSinceCreated > noMaintenanceDaysLimit) {
                reasons.add("Nenhuma manutenção realizada desde o cadastro há " + daysSinceCreated + " dias");
            }
        }

        return reasons;
    }
}
