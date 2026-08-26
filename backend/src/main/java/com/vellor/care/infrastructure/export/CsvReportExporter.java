package com.vellor.care.infrastructure.export;

import com.opencsv.CSVWriter;
import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.model.InventoryPart;
import com.vellor.care.domain.model.Maintenance;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class CsvReportExporter {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public byte[] exportComputersCsv(List<Computer> computers) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
             OutputStreamWriter osw = new OutputStreamWriter(out, StandardCharsets.UTF_8);
             CSVWriter writer = new CSVWriter(osw, ';', CSVWriter.DEFAULT_QUOTE_CHARACTER, CSVWriter.DEFAULT_ESCAPE_CHARACTER, CSVWriter.DEFAULT_LINE_END)) {

            // UTF-8 BOM para abrir corretamente no Excel brasileiro
            out.write(0xEF);
            out.write(0xBB);
            out.write(0xBF);

            writer.writeNext(new String[]{"Patrimonio", "Hostname", "NumeroSerie", "Modelo", "Fabricante", "Responsavel", "Processador", "RAM_GB", "Storage_GB", "Status", "ProximaPreventiva"});

            for (Computer c : computers) {
                writer.writeNext(new String[]{
                    c.assetTag(),
                    c.hostname(),
                    c.serialNumber(),
                    c.model(),
                    c.manufacturer(),
                    c.assignment() != null ? c.assignment().employeeName() : "",
                    c.hardware() != null ? c.hardware().processor() : "",
                    c.hardware() != null ? String.valueOf(c.hardware().ramGb()) : "",
                    c.hardware() != null ? String.valueOf(c.hardware().storageGb()) : "",
                    c.status().name(),
                    c.nextMaintenanceAt() != null ? c.nextMaintenanceAt().format(DATE_FMT) : ""
                });
            }

            writer.flush();
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Erro ao gerar CSV", e);
        }
    }

    public byte[] exportPartsCsv(List<InventoryPart> parts) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
             OutputStreamWriter osw = new OutputStreamWriter(out, StandardCharsets.UTF_8);
             CSVWriter writer = new CSVWriter(osw, ';', CSVWriter.DEFAULT_QUOTE_CHARACTER, CSVWriter.DEFAULT_ESCAPE_CHARACTER, CSVWriter.DEFAULT_LINE_END)) {

            out.write(0xEF);
            out.write(0xBB);
            out.write(0xBF);

            writer.writeNext(new String[]{"SKU", "Nome", "Categoria", "Quantidade", "Minimo", "Unidade", "ValorUnitario", "Localizacao"});

            for (InventoryPart p : parts) {
                writer.writeNext(new String[]{
                    p.sku(),
                    p.name(),
                    p.category().name(),
                    String.valueOf(p.quantity()),
                    String.valueOf(p.minimumQuantity()),
                    p.unit(),
                    p.unitValue() != null ? p.unitValue().toString() : "0.00",
                    p.location() != null ? p.location() : ""
                });
            }

            writer.flush();
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Erro ao gerar CSV de peças", e);
        }
    }
}
