package com.vellor.care.application.sector;

import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.model.ComputerStatus;
import com.vellor.care.domain.model.Sector;
import com.vellor.care.domain.repository.ComputerRepository;
import com.vellor.care.domain.repository.SectorRepository;
import com.vellor.care.domain.service.PreventiveHealthService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GetSectorComplianceUseCase {

    private final SectorRepository sectorRepository;
    private final ComputerRepository computerRepository;
    private final PreventiveHealthService preventiveHealthService;

    public List<SectorComplianceDTO> execute() {
        List<Sector> sectors = sectorRepository.findAll();
        LocalDate today = LocalDate.now();
        List<SectorComplianceDTO> results = new ArrayList<>();

        for (Sector sector : sectors) {
            List<Computer> computers = computerRepository.findBySectorId(sector.id());
            long total = computers.size();
            long active = computers.stream().filter(c -> c.status() == ComputerStatus.ATIVO).count();
            long onSchedule = 0;
            long warning = 0;
            long overdue = 0;

            for (Computer c : computers) {
                PreventiveHealthService.PreventiveHealth health = preventiveHealthService.calculateHealth(c, today);
                if (health == PreventiveHealthService.PreventiveHealth.EM_DIA) onSchedule++;
                else if (health == PreventiveHealthService.PreventiveHealth.PROXIMA) warning++;
                else overdue++;
            }

            int compliancePercent = total > 0 ? (int) Math.round(((double) onSchedule / total) * 100) : 100;

            results.add(new SectorComplianceDTO(
                sector.id(),
                sector.name(),
                sector.code(),
                sector.unitName(),
                sector.manager(),
                sector.color(),
                total,
                active,
                onSchedule,
                warning,
                overdue,
                compliancePercent
            ));
        }

        return results;
    }

    public record SectorComplianceDTO(
        UUID sectorId,
        String sectorName,
        String code,
        String unitName,
        String manager,
        String color,
        long totalComputers,
        long activeComputers,
        long onSchedule,
        long warning,
        long overdue,
        int compliancePercent
    ) {}
}
