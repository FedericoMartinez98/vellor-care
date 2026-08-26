package com.vellor.care.application.telemetry;

import com.opencsv.CSVReaderHeaderAware;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Le um CSV gerado pelo agente Windows (um snapshot de telemetria por linha) e
 * grava cada um via {@link IngestTelemetryUseCase}, que ja resolve o
 * computador por assetTag/hostname. Linhas cujo computador nao esteja
 * cadastrado sao reportadas em vez de derrubar a importacao inteira.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ImportTelemetryCsvUseCase {

    private final IngestTelemetryUseCase ingestTelemetryUseCase;

    public ImportResult execute(InputStream csvInputStream) {
        List<RowError> errors = new ArrayList<>();
        int total = 0;
        int imported = 0;

        try (CSVReaderHeaderAware reader = new CSVReaderHeaderAware(
            new InputStreamReader(csvInputStream, StandardCharsets.UTF_8))) {

            Map<String, String> row;
            while ((row = reader.readMap()) != null) {
                total++;
                int rowNumber = total + 1; // +1 = linha do cabecalho no arquivo original

                try {
                    ingestTelemetryUseCase.execute(toCommand(row));
                    imported++;
                } catch (IllegalArgumentException ex) {
                    errors.add(new RowError(rowNumber, row.get("assetTag"), row.get("hostname"), ex.getMessage()));
                } catch (Exception ex) {
                    log.warn("Falha ao importar linha {} do CSV de telemetria", rowNumber, ex);
                    errors.add(new RowError(rowNumber, row.get("assetTag"), row.get("hostname"),
                        "Linha invalida: " + ex.getMessage()));
                }
            }
        } catch (IOException | com.opencsv.exceptions.CsvValidationException ex) {
            throw new IllegalArgumentException("Nao foi possivel ler o arquivo CSV: " + ex.getMessage());
        }

        return new ImportResult(total, imported, errors);
    }

    private IngestTelemetryUseCase.TelemetryIngestCommand toCommand(Map<String, String> row) {
        return new IngestTelemetryUseCase.TelemetryIngestCommand(
            trim(row.get("assetTag")),
            trim(row.get("hostname")),
            parseInstant(row.get("collectedAt")),
            parseDecimal(row.get("ssdHealthPercent")),
            parseInt(row.get("ssdPowerOnHours")),
            parseDecimal(row.get("cpuTempC")),
            parseDecimal(row.get("gpuTempC")),
            parseDecimal(row.get("ssdTempC")),
            parseDecimal(row.get("cpuUsagePercent")),
            parseDecimal(row.get("ramUsagePercent")),
            parseDecimal(row.get("diskFreePercent")),
            parseDecimal(row.get("diskFreeGb")),
            parseDecimal(row.get("uptimeHours")),
            parseInstant(row.get("lastBootAt")),
            trim(row.get("windowsVersion")),
            trim(row.get("windowsBuild"))
        );
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }

    private BigDecimal parseDecimal(String value) {
        if (value == null || value.isBlank()) return null;
        return new BigDecimal(value.trim());
    }

    private Integer parseInt(String value) {
        if (value == null || value.isBlank()) return null;
        return Integer.valueOf(value.trim());
    }

    private Instant parseInstant(String value) {
        if (value == null || value.isBlank()) return null;
        return Instant.parse(value.trim());
    }

    public record RowError(int line, String assetTag, String hostname, String reason) {}

    public record ImportResult(int totalRows, int imported, List<RowError> errors) {}
}
