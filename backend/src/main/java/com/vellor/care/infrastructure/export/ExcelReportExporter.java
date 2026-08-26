package com.vellor.care.infrastructure.export;

import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.model.InventoryPart;
import com.vellor.care.domain.model.Maintenance;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ExcelReportExporter {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public byte[] exportComputersExcel(List<Computer> computers) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Inventário");

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.ROYAL_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font font = workbook.createFont();
            font.setColor(IndexedColors.WHITE.getIndex());
            font.setBold(true);
            headerStyle.setFont(font);

            String[] columns = {"Patrimônio", "Hostname", "Número de Série", "Modelo", "Responsável", "Processador", "RAM (GB)", "Armazenamento", "Status", "Próx. Preventiva"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (Computer c : computers) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(c.assetTag());
                row.createCell(1).setCellValue(c.hostname());
                row.createCell(2).setCellValue(c.serialNumber());
                row.createCell(3).setCellValue(c.model());
                row.createCell(4).setCellValue(c.assignment() != null ? c.assignment().employeeName() : "");
                row.createCell(5).setCellValue(c.hardware() != null ? c.hardware().processor() : "");
                row.createCell(6).setCellValue(c.hardware() != null ? c.hardware().ramGb() : 0);
                row.createCell(7).setCellValue(c.hardware() != null ? c.hardware().storageGb() + " GB " + c.hardware().storageType() : "");
                row.createCell(8).setCellValue(c.status().name());
                row.createCell(9).setCellValue(c.nextMaintenanceAt() != null ? c.nextMaintenanceAt().format(DATE_FMT) : "");
            }

            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Erro ao gerar Excel de computadores", e);
        }
    }

    public byte[] exportPartsExcel(List<InventoryPart> parts) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Estoque");

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.DARK_GREEN.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font font = workbook.createFont();
            font.setColor(IndexedColors.WHITE.getIndex());
            font.setBold(true);
            headerStyle.setFont(font);

            String[] columns = {"SKU", "Nome da Peça", "Categoria", "Saldo Atual", "Estoque Mínimo", "Unidade", "Valor Unitário (R$)", "Fornecedor", "Localização"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (InventoryPart p : parts) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(p.sku());
                row.createCell(1).setCellValue(p.name());
                row.createCell(2).setCellValue(p.category().name());
                row.createCell(3).setCellValue(p.quantity());
                row.createCell(4).setCellValue(p.minimumQuantity());
                row.createCell(5).setCellValue(p.unit());
                row.createCell(6).setCellValue(p.unitValue() != null ? p.unitValue().doubleValue() : 0.0);
                row.createCell(7).setCellValue(p.supplier() != null ? p.supplier() : "");
                row.createCell(8).setCellValue(p.location() != null ? p.location() : "");
            }

            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Erro ao gerar Excel de peças", e);
        }
    }
}
