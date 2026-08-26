package com.vellor.care.infrastructure.config;

import com.vellor.care.domain.service.AlertEvaluationService;
import com.vellor.care.domain.service.ComputerCriticalityService;
import com.vellor.care.domain.service.PreventiveHealthService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;

@Configuration
public class DomainServiceConfig {

    @Value("${vellor.preventives.warning-days:7}")
    private int warningDays;

    @Value("${vellor.health.critical-ssd-health-percent:20}")
    private BigDecimal criticalSsdHealthPercent;

    @Value("${vellor.health.critical-cpu-temp-c:85}")
    private BigDecimal criticalCpuTempC;

    @Value("${vellor.preventives.no-maintenance-days-limit:120}")
    private int noMaintenanceDaysLimit;

    @Bean
    public PreventiveHealthService preventiveHealthService() {
        return new PreventiveHealthService(warningDays);
    }

    @Bean
    public ComputerCriticalityService computerCriticalityService() {
        return new ComputerCriticalityService(criticalSsdHealthPercent, criticalCpuTempC, noMaintenanceDaysLimit);
    }

    @Bean
    public AlertEvaluationService alertEvaluationService() {
        return new AlertEvaluationService(criticalSsdHealthPercent, criticalCpuTempC, warningDays, noMaintenanceDaysLimit);
    }
}
