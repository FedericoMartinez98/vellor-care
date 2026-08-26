package com.vellor.care.interfaces.rest.dto.response;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record DashboardMetricsResponse(
    long totalComputers,
    long activeComputers,
    long inMaintenanceComputers,
    long onSchedulePreventives,
    long warningPreventives,
    long overduePreventives,
    int globalCompliancePercent,
    long lowStockPartsCount,
    long unreadNotificationsCount,
    List<SectorMetricDTO> sectors,
    List<RecentMaintenanceDTO> recentMaintenances
) {
    public record SectorMetricDTO(
        UUID sectorId,
        String sectorName,
        String color,
        long total,
        long onSchedule,
        long overdue,
        int compliancePercent
    ) {}

    public record RecentMaintenanceDTO(
        UUID id,
        String assetTag,
        String hostname,
        String type,
        String status,
        String technicianName,
        String finishedAt
    ) {}
}
