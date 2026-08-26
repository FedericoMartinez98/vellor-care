/**
 * Vellor Care — Utilitários de exportação de dados (PDF, Excel, CSV).
 * Utiliza jsPDF + jspdf-autotable para PDF, ExcelJS para planilhas e PapaParse para CSV.
 */

import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Papa from 'papaparse'

import {
  COMPUTER_STATUS_LABELS,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_TYPE_LABELS,
  PART_CATEGORY_LABELS,
  PREVENTIVE_HEALTH_LABELS,
} from '@/lib/constants'
import { formatCurrency, formatDate, formatPercent } from '@/lib/format'
import { preventiveHealthOf } from '@/lib/status'
import type { Computer, InventoryPart, Maintenance, Sector } from '@/lib/types'

// Helper para download de arquivo no browser
function triggerDownload(blob: Blob, filename: string) {
  if (typeof window === 'undefined') return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ============================================================================
// 1. Exportação de Computadores (Inventário)
// ============================================================================

export function exportComputersCsv(computers: Computer[], sectors: Sector[]) {
  const sectorMap = new Map(sectors.map((s) => [s.id, s.name]))

  const data = computers.map((c) => ({
    Patrimônio: c.assetTag,
    Hostname: c.hostname,
    'Número de Série': c.serialNumber,
    Fabricante: c.manufacturer,
    Modelo: c.model,
    Status: COMPUTER_STATUS_LABELS[c.status],
    'Situação Preventiva': PREVENTIVE_HEALTH_LABELS[preventiveHealthOf(c)],
    Responsável: c.assignment.employeeName,
    'E-mail': c.assignment.employeeEmail,
    Setor: sectorMap.get(c.assignment.sectorId) ?? '',
    Unidade: c.assignment.unit,
    Processador: c.hardware.processor,
    'RAM (GB)': c.hardware.ramGb,
    Armazenamento: `${c.hardware.storageGb} GB (${c.hardware.storageType})`,
    'Versão Windows': c.system.windowsVersion,
    'Última Manutenção': c.lastMaintenanceAt ? formatDate(c.lastMaintenanceAt) : 'Nunca',
    'Próxima Manutenção': c.nextMaintenanceAt ? formatDate(c.nextMaintenanceAt) : '',
  }))

  const csv = Papa.unparse(data)
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, `inventario-vellor-care-${new Date().toISOString().slice(0, 10)}.csv`)
}

export async function exportComputersXlsx(computers: Computer[], sectors: Sector[]) {
  const sectorMap = new Map(sectors.map((s) => [s.id, s.name]))
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Inventário')

  worksheet.columns = [
    { header: 'Patrimônio', key: 'assetTag', width: 14 },
    { header: 'Hostname', key: 'hostname', width: 16 },
    { header: 'Fabricante', key: 'manufacturer', width: 14 },
    { header: 'Modelo', key: 'model', width: 22 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Preventiva', key: 'health', width: 14 },
    { header: 'Responsável', key: 'employee', width: 24 },
    { header: 'Setor', key: 'sector', width: 18 },
    { header: 'Unidade', key: 'unit', width: 16 },
    { header: 'Processador', key: 'processor', width: 22 },
    { header: 'RAM (GB)', key: 'ram', width: 12 },
    { header: 'Armazenamento', key: 'storage', width: 18 },
    { header: 'Última Prev.', key: 'lastMaint', width: 14 },
    { header: 'Próxima Prev.', key: 'nextMaint', width: 14 },
  ]

  computers.forEach((c) => {
    worksheet.addRow({
      assetTag: c.assetTag,
      hostname: c.hostname,
      manufacturer: c.manufacturer,
      model: c.model,
      status: COMPUTER_STATUS_LABELS[c.status],
      health: PREVENTIVE_HEALTH_LABELS[preventiveHealthOf(c)],
      employee: c.assignment.employeeName,
      sector: sectorMap.get(c.assignment.sectorId) ?? '',
      unit: c.assignment.unit,
      processor: c.hardware.processor,
      ram: c.hardware.ramGb,
      storage: `${c.hardware.storageGb} GB ${c.hardware.storageType}`,
      lastMaint: c.lastMaintenanceAt ? formatDate(c.lastMaintenanceAt) : 'Nunca',
      nextMaint: c.nextMaintenanceAt ? formatDate(c.nextMaintenanceAt) : '',
    })
  })

  // Estiliza cabeçalho
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  triggerDownload(blob, `inventario-vellor-care-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export function exportComputersPdf(computers: Computer[], sectors: Sector[]) {
  const sectorMap = new Map(sectors.map((s) => [s.id, s.name]))
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  doc.setFontSize(16)
  doc.text('Vellor Care — Relatório de Inventário de Ativos', 14, 15)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')} · Total: ${computers.length} equipamentos`, 14, 22)

  const rows = computers.map((c) => [
    c.assetTag,
    c.hostname,
    c.model,
    c.assignment.employeeName,
    sectorMap.get(c.assignment.sectorId) ?? '',
    COMPUTER_STATUS_LABELS[c.status],
    PREVENTIVE_HEALTH_LABELS[preventiveHealthOf(c)],
    c.nextMaintenanceAt ? formatDate(c.nextMaintenanceAt) : '—',
  ])

  autoTable(doc, {
    startY: 28,
    head: [['Patrimônio', 'Hostname', 'Modelo', 'Responsável', 'Setor', 'Status', 'Preventiva', 'Próxima Prev.']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
  })

  doc.save(`inventario-vellor-care-${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ============================================================================
// 2. Exportação de Manutenções (Histórico / Ordens)
// ============================================================================

export function exportMaintenancesCsv(maintenances: Maintenance[]) {
  const data = maintenances.map((m) => ({
    ID: m.id,
    Patrimônio: m.assetTag,
    Hostname: m.hostname,
    Tipo: MAINTENANCE_TYPE_LABELS[m.type],
    Status: MAINTENANCE_STATUS_LABELS[m.status],
    Técnico: m.technicianName,
    Agendado: formatDate(m.scheduledFor),
    Iniciado: m.startedAt ? formatDate(m.startedAt) : '',
    Concluído: m.finishedAt ? formatDate(m.finishedAt) : '',
    'Duração (min)': m.durationMinutes ?? '',
    Observações: m.notes ?? '',
  }))

  const csv = Papa.unparse(data)
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, `historico-manutencoes-${new Date().toISOString().slice(0, 10)}.csv`)
}

export async function exportMaintenancesXlsx(maintenances: Maintenance[]) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Manutenções')

  worksheet.columns = [
    { header: 'Patrimônio', key: 'assetTag', width: 14 },
    { header: 'Hostname', key: 'hostname', width: 16 },
    { header: 'Tipo', key: 'type', width: 14 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Técnico', key: 'technician', width: 22 },
    { header: 'Agendado', key: 'scheduled', width: 14 },
    { header: 'Concluído', key: 'finished', width: 14 },
    { header: 'Duração (min)', key: 'duration', width: 14 },
    { header: 'Peças Usadas', key: 'parts', width: 28 },
    { header: 'Observações', key: 'notes', width: 30 },
  ]

  maintenances.forEach((m) => {
    const partsStr = m.parts.map((p) => `${p.partName} (${p.quantity}x)`).join(', ')
    worksheet.addRow({
      assetTag: m.assetTag,
      hostname: m.hostname,
      type: MAINTENANCE_TYPE_LABELS[m.type],
      status: MAINTENANCE_STATUS_LABELS[m.status],
      technician: m.technicianName,
      scheduled: formatDate(m.scheduledFor),
      finished: m.finishedAt ? formatDate(m.finishedAt) : '',
      duration: m.durationMinutes ?? '',
      parts: partsStr,
      notes: m.notes ?? '',
    })
  })

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  triggerDownload(blob, `historico-manutencoes-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export function exportMaintenancesPdf(maintenances: Maintenance[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  doc.setFontSize(16)
  doc.text('Vellor Care — Histórico de Atendimentos e Manutenções', 14, 15)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')} · Total: ${maintenances.length} registros`, 14, 22)

  const rows = maintenances.map((m) => [
    m.assetTag,
    m.hostname,
    MAINTENANCE_TYPE_LABELS[m.type],
    m.technicianName,
    formatDate(m.scheduledFor),
    MAINTENANCE_STATUS_LABELS[m.status],
    m.durationMinutes ? `${m.durationMinutes} min` : '—',
    m.notes ? m.notes.slice(0, 40) : '—',
  ])

  autoTable(doc, {
    startY: 28,
    head: [['Patrimônio', 'Hostname', 'Tipo', 'Técnico', 'Data', 'Status', 'Duração', 'Observações']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
  })

  doc.save(`historico-manutencoes-${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ============================================================================
// 3. Exportação de Peças de Estoque
// ============================================================================

export function exportPartsCsv(parts: InventoryPart[]) {
  const data = parts.map((p) => ({
    SKU: p.sku,
    Nome: p.name,
    Categoria: PART_CATEGORY_LABELS[p.category],
    Saldo: p.quantity,
    'Estoque Mínimo': p.minimumQuantity,
    Unidade: p.unit,
    'Valor Unitário (R$)': p.unitValue,
    'Valor Total (R$)': p.quantity * p.unitValue,
    Localização: p.location ?? '',
    Fornecedor: p.supplier ?? '',
  }))

  const csv = Papa.unparse(data)
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, `estoque-pecas-${new Date().toISOString().slice(0, 10)}.csv`)
}

export async function exportPartsXlsx(parts: InventoryPart[]) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Estoque')

  worksheet.columns = [
    { header: 'SKU', key: 'sku', width: 16 },
    { header: 'Nome da Peça', key: 'name', width: 28 },
    { header: 'Categoria', key: 'category', width: 16 },
    { header: 'Saldo', key: 'qty', width: 10 },
    { header: 'Mínimo', key: 'min', width: 10 },
    { header: 'Un.', key: 'unit', width: 8 },
    { header: 'Valor Unit. (R$)', key: 'unitValue', width: 16 },
    { header: 'Valor Total (R$)', key: 'totalValue', width: 16 },
    { header: 'Localização', key: 'location', width: 18 },
  ]

  parts.forEach((p) => {
    worksheet.addRow({
      sku: p.sku,
      name: p.name,
      category: PART_CATEGORY_LABELS[p.category],
      qty: p.quantity,
      min: p.minimumQuantity,
      unit: p.unit,
      unitValue: p.unitValue,
      totalValue: p.quantity * p.unitValue,
      location: p.location ?? '',
    })
  })

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  triggerDownload(blob, `estoque-pecas-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export function exportPartsPdf(parts: InventoryPart[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  doc.setFontSize(16)
  doc.text('Vellor Care — Catálogo e Saldo de Peças', 14, 15)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')} · Itens: ${parts.length}`, 14, 22)

  const rows = parts.map((p) => [
    p.sku,
    p.name,
    PART_CATEGORY_LABELS[p.category],
    `${p.quantity} ${p.unit}`,
    `${p.minimumQuantity} ${p.unit}`,
    formatCurrency(p.unitValue),
    formatCurrency(p.quantity * p.unitValue),
  ])

  autoTable(doc, {
    startY: 28,
    head: [['SKU', 'Nome', 'Categoria', 'Saldo', 'Mínimo', 'Valor Unit.', 'Valor Total']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
  })

  doc.save(`estoque-pecas-${new Date().toISOString().slice(0, 10)}.pdf`)
}
