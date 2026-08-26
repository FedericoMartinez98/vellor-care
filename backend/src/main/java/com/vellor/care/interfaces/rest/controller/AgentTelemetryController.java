package com.vellor.care.interfaces.rest.controller;

import com.vellor.care.application.telemetry.IngestTelemetryUseCase;
import com.vellor.care.domain.model.HealthSnapshot;
import com.vellor.care.interfaces.rest.dto.request.TelemetryIngestRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/agent/telemetry")
@RequiredArgsConstructor
@Tag(name = "Agente Windows", description = "Ingestão de telemetria WMI e inventário contínuo.")
public class AgentTelemetryController {

    private final IngestTelemetryUseCase ingestTelemetryUseCase;

    @PostMapping
    @Operation(
        summary = "Ingestão de telemetria",
        description = "Recebe métricas de saúde, temperaturas, disco e SMART do agente Windows.",
        security = @SecurityRequirement(name = "X-Agent-Api-Key")
    )
    public ResponseEntity<Map<String, Object>> ingest(@Valid @RequestBody TelemetryIngestRequest request) {
        IngestTelemetryUseCase.TelemetryIngestCommand command = new IngestTelemetryUseCase.TelemetryIngestCommand(
            request.assetTag(),
            request.hostname(),
            request.collectedAt(),
            request.ssdHealthPercent(),
            request.ssdPowerOnHours(),
            request.cpuTempC(),
            request.gpuTempC(),
            request.ssdTempC(),
            request.cpuUsagePercent(),
            request.ramUsagePercent(),
            request.diskFreePercent(),
            request.diskFreeGb(),
            request.uptimeHours(),
            request.lastBootAt(),
            request.windowsVersion(),
            request.windowsBuild()
        );

        HealthSnapshot saved = ingestTelemetryUseCase.execute(command);

        return ResponseEntity.ok(Map.of(
            "status", "SUCCESS",
            "message", "Telemetria registrada com sucesso",
            "snapshotId", saved.id(),
            "computerId", saved.computerId()
        ));
    }
}
