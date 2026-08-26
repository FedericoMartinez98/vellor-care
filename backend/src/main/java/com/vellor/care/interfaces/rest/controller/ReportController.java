package com.vellor.care.interfaces.rest.controller;

import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.model.InventoryPart;
import com.vellor.care.domain.model.Maintenance;
import com.vellor.care.domain.repository.ComputerRepository;
import com.vellor.care.domain.repository.InventoryPartRepository;
import com.vellor.care.domain.repository.MaintenanceRepository;
import com.vellor.care.infrastructure.export.CsvReportExporter;
import com.vellor.care.infrastructure.export.ExcelReportExporter;
import com.vellor.care.infrastructure.export.PdfReportExporter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Tag(name = "Relatórios e Exportações", description = "Exportação de relatórios em PDF, Excel e CSV.")
public class ReportController {

    private final ComputerRepository computerRepository;
    private final MaintenanceRepository maintenanceRepository;
    private final InventoryPartRepository partRepository;
    private final PdfReportExporter pdfReportExporter;
    private final ExcelReportExporter excelReportExporter;
    private final CsvReportExporter csvReportExporter;

    @GetMapping("/computers/pdf")
    @Operation(summary = "Exportar computadores em PDF", description = "Gera arquivo PDF do inventário.")
    public ResponseEntity<byte[]> exportComputersPdf(@RequestParam(required = false) UUID sectorId) {
        List<Computer> computers = sectorId != null ? computerRepository.findBySectorId(sectorId) : computerRepository.findAll();
        byte[] content = pdfReportExporter.exportComputersPdf(computers);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=computadores.pdf")
            .contentType(MediaType.APPLICATION_PDF)
            .body(content);
    }

    @GetMapping("/computers/excel")
    @Operation(summary = "Exportar computadores em Excel", description = "Gera arquivo .xlsx do inventário.")
    public ResponseEntity<byte[]> exportComputersExcel(@RequestParam(required = false) UUID sectorId) {
        List<Computer> computers = sectorId != null ? computerRepository.findBySectorId(sectorId) : computerRepository.findAll();
        byte[] content = excelReportExporter.exportComputersExcel(computers);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=computadores.xlsx")
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(content);
    }

    @GetMapping("/computers/csv")
    @Operation(summary = "Exportar computadores em CSV", description = "Gera arquivo .csv do inventário.")
    public ResponseEntity<byte[]> exportComputersCsv(@RequestParam(required = false) UUID sectorId) {
        List<Computer> computers = sectorId != null ? computerRepository.findBySectorId(sectorId) : computerRepository.findAll();
        byte[] content = csvReportExporter.exportComputersCsv(computers);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=computadores.csv")
            .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
            .body(content);
    }

    @GetMapping("/maintenances/pdf")
    @Operation(summary = "Exportar manutenções em PDF", description = "Gera relatório PDF de manutenções.")
    public ResponseEntity<byte[]> exportMaintenancesPdf() {
        List<Maintenance> list = maintenanceRepository.findAll();
        byte[] content = pdfReportExporter.exportMaintenancesPdf(list);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=manutenções.pdf")
            .contentType(MediaType.APPLICATION_PDF)
            .body(content);
    }

    @GetMapping("/parts/excel")
    @Operation(summary = "Exportar peças em Excel", description = "Gera arquivo .xlsx de saldo de peças.")
    public ResponseEntity<byte[]> exportPartsExcel() {
        List<InventoryPart> list = partRepository.findAll();
        byte[] content = excelReportExporter.exportPartsExcel(list);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=pecas.xlsx")
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(content);
    }

    @GetMapping("/parts/csv")
    @Operation(summary = "Exportar peças em CSV", description = "Gera arquivo .csv de saldo de peças.")
    public ResponseEntity<byte[]> exportPartsCsv() {
        List<InventoryPart> list = partRepository.findAll();
        byte[] content = csvReportExporter.exportPartsCsv(list);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=pecas.csv")
            .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
            .body(content);
    }
}
