package com.vellor.care.domain.service;

import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.model.ComputerStatus;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public class PreventiveHealthService {

    private final int warningDays;

    public PreventiveHealthService(int warningDays) {
        this.warningDays = warningDays;
    }

    public PreventiveHealth calculateHealth(Computer computer, LocalDate today) {
        if (computer.status() != ComputerStatus.ATIVO) {
            return PreventiveHealth.EM_DIA;
        }

        LocalDate next = computer.nextMaintenanceAt();
        if (next == null) {
            return PreventiveHealth.ATRASADA;
        }

        if (next.isBefore(today)) {
            return PreventiveHealth.ATRASADA;
        }

        long daysUntil = ChronoUnit.DAYS.between(today, next);
        if (daysUntil <= warningDays) {
            return PreventiveHealth.PROXIMA;
        }

        return PreventiveHealth.EM_DIA;
    }

    public enum PreventiveHealth {
        EM_DIA,
        PROXIMA,
        ATRASADA
    }
}
