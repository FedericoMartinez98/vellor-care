package com.vellor.care.interfaces.rest.controller;

import com.vellor.care.application.sector.GetSectorComplianceUseCase;
import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.model.ComputerStatus;
import com.vellor.care.domain.model.Maintenance;
import com.vellor.care.domain.repository.ComputerRepository;
import com.vellor.care.domain.repository.InventoryPartRepository;
import com.vellor.care.domain.repository.MaintenanceRepository;
import com.vellor.care.domain.repository.NotificationRepository;
import com.vellor.care.domain.service.PreventiveHealthService;
import com.vellor.care.interfaces.rest.dto.response.DashboardMetricsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Métricas consolidadas, semáforo e resumo executivo.")
public class DashboardController {

    private final ComputerRepository computerRepository;
    private final MaintenanceRepository maintenanceRepository;
    private final InventoryPartRepository partRepository;
    private final NotificationRepository notificationRepository;
    private final PreventiveHealthService preventiveHealthService;
    private final GetSectorComplianceUseCase getSectorComplianceUseCase;

    @GetMapping("/metrics")
    @Operation(summary = "Métricas do Dashboard", description = "Retorna contadores de ativos, semáforo de preventivas, peças em baixa e setores.")
    public ResponseEntity<DashboardMetricsResponse> getMetrics() {
        List<Computer> computers = computerRepository.findAll();
        LocalDate today = LocalDate.now();

        long total = computers.size();
        long active = computers.stream().filter(c -> c.status() == ComputerStatus.ATIVO).count();
        long inMaintenance = computers.stream().filter(c -> c.status() == ComputerStatus.EM_MANUTENCAO).count();

        long onSchedule = 0;
        long warning = 0;
        long overdue = 0;

        for (Computer c : computers) {
            PreventiveHealthService.PreventiveHealth health = preventiveHealthService.calculateHealth(c, today);
            if (health == PreventiveHealthService.PreventiveHealth.EM_DIA) onSchedule++;
            else if (health == PreventiveHealthService.PreventiveHealth.PROXIMA) warning++;
            else overdue++;
        }

        int globalCompliance = total > 0 ? (int) Math.round(((double) onSchedule / total) * 100) : 100;
        long lowStock = partRepository.findLowStock().size();
        long unreadNotifs = notificationRepository.count();

        List<GetSectorComplianceUseCase.SectorComplianceDTO> complianceList = getSectorComplianceUseCase.execute();
        List<DashboardMetricsResponse.SectorMetricDTO> sectorMetrics = complianceList.stream()
            .map(s -> new DashboardMetricsResponse.SectorMetricDTO(
                s.sectorId(),
                s.sectorName(),
                s.color(),
                s.totalComputers(),
                s.onSchedule(),
                s.overdue(),
                s.compliancePercent()
            ))
            .toList();

        List<Maintenance> recentMaintenances = maintenanceRepository.findAll().stream()
            .sorted((a, b) -> (b.scheduledFor() != null ? b.scheduledFor().toString() : "").compareTo(a.scheduledFor() != null ? a.scheduledFor().toString() : ""))
            .limit(5)
            .toList();

        List<DashboardMetricsResponse.RecentMaintenanceDTO> recentDTOs = recentMaintenances.stream()
            .map(m -> new DashboardMetricsResponse.RecentMaintenanceDTO(
                m.id(),
                m.assetTag(),
                m.hostname(),
                m.type().name(),
                m.status().name(),
                m.technicianName(),
                m.finishedAt() != null ? m.finishedAt().toString() : (m.scheduledFor() != null ? m.scheduledFor().toString() : "")
            ))
            .toList();

        return ResponseEntity.ok(new DashboardMetricsResponse(
            total,
            active,
            inMaintenance,
            onSchedule,
            warning,
            overdue,
            globalCompliance,
            lowStock,
            unreadNotifs,
            sectorMetrics,
            recentDTOs
        ));
    }
}
