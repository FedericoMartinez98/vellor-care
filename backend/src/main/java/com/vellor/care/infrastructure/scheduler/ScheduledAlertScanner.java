package com.vellor.care.infrastructure.scheduler;

import com.vellor.care.application.notification.ScanAndGenerateAlertsUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ScheduledAlertScanner {

    private final ScanAndGenerateAlertsUseCase scanAndGenerateAlertsUseCase;

    /**
     * Varredura diária programada para verificar preventivas próximas, atrasadas e alertas de saúde.
     * Executa todos os dias às 06:00 UTC (ou configurado no application.yml).
     */
    @Scheduled(cron = "${vellor.scheduler.alerts-cron:0 0 6 * * *}")
    public void runDailyScan() {
        log.info("Iniciando varredura diária de alertas e preventivas...");
        try {
            int newAlerts = scanAndGenerateAlertsUseCase.execute();
            log.info("Varredura diária concluída com sucesso. Total de novos alertas gerados: {}", newAlerts);
        } catch (Exception e) {
            log.error("Erro durante a execução da varredura diária de alertas", e);
        }
    }
}
