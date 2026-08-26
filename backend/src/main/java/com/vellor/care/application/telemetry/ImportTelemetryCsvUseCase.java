package com.vellor.care.application.telemetry;

import com.opencsv.CSVReaderHeaderAware;
import com.vellor.care.domain.model.StorageType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.PushbackInputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Le um CSV gerado pelo agente Windows (um snapshot de telemetria por linha)
 * e resolve cada linha via {@link RegisterOrUpdateTelemetryUseCase}: cadastra
 * o computador automaticamente se for a primeira vez que aparece, ou grava um
 * novo snapshot + notifica se ele já existir. Linhas malformadas são
 * reportadas em vez de derrubar a importação inteira.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ImportTelemetryCsvUseCase {

    private final RegisterOrUpdateTelemetryUseCase registerOrUpdateTelemetryUseCase;

    public ImportResult execute(InputStream csvInputStream) {
        List<RowError> errors = new ArrayList<>();
        int total = 0;
        int created = 0;
        int updated = 0;

        try (CSVReaderHeaderAware reader = new CSVReaderHeaderAware(
            new InputStreamReader(skipUtf8Bom(csvInputStream), StandardCharsets.UTF_8))) {

            Map<String, String> row;
            while ((row = reader.readMap()) != null) {
                total++;
                int rowNumber = total + 1; // +1 = linha do cabecalho no arquivo original

                try {
                    RegisterOrUpdateTelemetryUseCase.Result result =
                        registerOrUpdateTelemetryUseCase.execute(toRow(row));

                    if (result.outcome() == RegisterOrUpdateTelemetryUseCase.Outcome.CREATED) {
                        created++;
                    } else {
                        updated++;
                    }
                } catch (Exception ex) {
                    log.warn("Falha ao importar linha {} do CSV de telemetria", rowNumber, ex);
                    errors.add(new RowError(rowNumber, row.get("assetTag"), row.get("hostname"), ex.getMessage()));
                }
            }
        } catch (IOException | com.opencsv.exceptions.CsvValidationException ex) {
            throw new IllegalArgumentException("Não foi possível ler o arquivo CSV: " + ex.getMessage());
        }

        return new ImportResult(total, created, updated, errors);
    }

    /**
     * O PowerShell (`Export-Csv -Encoding UTF8`) grava um BOM UTF-8 no início
     * do arquivo. Sem remover, ele gruda no nome da primeira coluna do
     * cabeçalho ("﻿assetTag" em vez de "assetTag") e a linha inteira
     * falha por "assetTag ausente".
     */
    private InputStream skipUtf8Bom(InputStream input) throws IOException {
        PushbackInputStream pushback = new PushbackInputStream(input, 3);
        byte[] bom = new byte[3];
        int read = pushback.read(bom, 0, 3);
        if (read != 3 || bom[0] != (byte) 0xEF || bom[1] != (byte) 0xBB || bom[2] != (byte) 0xBF) {
            if (read > 0) pushback.unread(bom, 0, read);
        }
        return pushback;
    }

    private TelemetryImportRow toRow(Map<String, String> row) {
        return new TelemetryImportRow(
            trim(row.get("assetTag")),
            trim(row.get("hostname")),
            trim(row.get("manufacturer")),
            trim(row.get("model")),
            trim(row.get("serialNumber")),
            trim(row.get("processor")),
            parseInt(row.get("ramGb")),
            parseStorageType(row.get("storageType")),
            parseInt(row.get("storageGb")),
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
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
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

    private StorageType parseStorageType(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return StorageType.valueOf(value.trim());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    public record RowError(int line, String assetTag, String hostname, String reason) {}

    public record ImportResult(int totalRows, int created, int updated, List<RowError> errors) {}
}
