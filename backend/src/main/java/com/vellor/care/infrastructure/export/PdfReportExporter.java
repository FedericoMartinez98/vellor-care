package com.vellor.care.infrastructure.export;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.model.Maintenance;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class PdfReportExporter {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public byte[] exportComputersPdf(List<Computer> computers) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4.rotate(), 20, 20, 20, 20);

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Título
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, Color.DARK_GRAY);
            Paragraph title = new Paragraph("Vellor Care — Relatório de Inventário de Computadores", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(15);
            document.add(title);

            // Tabela
            PdfPTable table = new PdfPTable(7);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1.5f, 2f, 2.5f, 2f, 1.5f, 1.5f, 1.5f});

            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
            String[] headers = {"Patrimônio", "Hostname", "Responsável", "Processador", "RAM", "Status", "Próx. Prev."};

            for (String header : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(header, headerFont));
                cell.setBackgroundColor(new Color(41, 128, 185));
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setPadding(6);
                table.addCell(cell);
            }

            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);
            for (Computer c : computers) {
                table.addCell(new PdfPCell(new Phrase(c.assetTag(), bodyFont)));
                table.addCell(new PdfPCell(new Phrase(c.hostname(), bodyFont)));
                table.addCell(new PdfPCell(new Phrase(c.assignment() != null ? c.assignment().employeeName() : "—", bodyFont)));
                table.addCell(new PdfPCell(new Phrase(c.hardware() != null ? c.hardware().processor() : "—", bodyFont)));
                table.addCell(new PdfPCell(new Phrase(c.hardware() != null ? c.hardware().ramGb() + " GB" : "—", bodyFont)));
                table.addCell(new PdfPCell(new Phrase(c.status().name(), bodyFont)));
                table.addCell(new PdfPCell(new Phrase(c.nextMaintenanceAt() != null ? c.nextMaintenanceAt().format(DATE_FMT) : "—", bodyFont)));
            }

            document.add(table);
            document.close();
        } catch (DocumentException e) {
            throw new RuntimeException("Erro ao gerar PDF", e);
        }

        return out.toByteArray();
    }

    public byte[] exportMaintenancesPdf(List<Maintenance> maintenances) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4.rotate(), 20, 20, 20, 20);

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, Color.DARK_GRAY);
            Paragraph title = new Paragraph("Vellor Care — Relatório de Manutenções e Preventivas", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(15);
            document.add(title);

            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1.5f, 2f, 1.5f, 2f, 1.5f, 1.5f});

            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
            String[] headers = {"Patrimônio", "Hostname", "Tipo", "Técnico", "Status", "Data Programada"};

            for (String header : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(header, headerFont));
                cell.setBackgroundColor(new Color(39, 174, 96));
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setPadding(6);
                table.addCell(cell);
            }

            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);
            for (Maintenance m : maintenances) {
                table.addCell(new PdfPCell(new Phrase(m.assetTag(), bodyFont)));
                table.addCell(new PdfPCell(new Phrase(m.hostname(), bodyFont)));
                table.addCell(new PdfPCell(new Phrase(m.type().name(), bodyFont)));
                table.addCell(new PdfPCell(new Phrase(m.technicianName(), bodyFont)));
                table.addCell(new PdfPCell(new Phrase(m.status().name(), bodyFont)));
                table.addCell(new PdfPCell(new Phrase(m.scheduledFor() != null ? m.scheduledFor().format(DATE_FMT) : "—", bodyFont)));
            }

            document.add(table);
            document.close();
        } catch (DocumentException e) {
            throw new RuntimeException("Erro ao gerar PDF de manutenções", e);
        }

        return out.toByteArray();
    }
}
