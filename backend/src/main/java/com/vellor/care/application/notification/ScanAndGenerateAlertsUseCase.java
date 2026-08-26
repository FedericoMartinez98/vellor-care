package com.vellor.care.application.notification;

import com.vellor.care.domain.model.AppNotification;
import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.model.InventoryPart;
import com.vellor.care.domain.repository.ComputerRepository;
import com.vellor.care.domain.repository.InventoryPartRepository;
import com.vellor.care.domain.repository.NotificationRepository;
import com.vellor.care.domain.service.AlertEvaluationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScanAndGenerateAlertsUseCase {

    private final ComputerRepository computerRepository;
    private final InventoryPartRepository partRepository;
    private final NotificationRepository notificationRepository;
    private final AlertEvaluationService alertEvaluationService;

    @Transactional
    public int execute() {
        LocalDate today = LocalDate.now();
        int createdCount = 0;

        // 1. Alertas de Computadores
        List<Computer> computers = computerRepository.findAll();
        for (Computer comp : computers) {
            List<AppNotification> alerts = alertEvaluationService.evaluateComputerAlerts(comp, today);
            for (AppNotification alert : alerts) {
                if (alert.dedupKey() != null && notificationRepository.findByDedupKey(alert.dedupKey()).isEmpty()) {
                    notificationRepository.save(alert);
                    createdCount++;
                }
            }
        }

        // 2. Alertas de Estoque Baixo
        List<InventoryPart> lowStockParts = partRepository.findLowStock();
        for (InventoryPart part : lowStockParts) {
            List<AppNotification> alerts = alertEvaluationService.evaluatePartAlerts(part, today);
            for (AppNotification alert : alerts) {
                if (alert.dedupKey() != null && notificationRepository.findByDedupKey(alert.dedupKey()).isEmpty()) {
                    notificationRepository.save(alert);
                    createdCount++;
                }
            }
        }

        if (createdCount > 0) {
            log.info("Scanner de alertas gerou {} novas notificações em {}.", createdCount, today);
        }

        return createdCount;
    }
}
