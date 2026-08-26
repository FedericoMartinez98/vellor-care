'use client'

/**
 * Aba "Etiqueta e QR Code": visualização da etiqueta patrimonial física,
 * geração do QR Code interativo, download do código ZPL II (Zebra) e impressão.
 */

import * as React from 'react'
import { Download, FileCode, Printer, QrCode } from 'lucide-react'
import { toast } from 'sonner'

import { QrCodeView, SectionCard } from '@/components/shared'
import { Button } from '@/components/ui/button'
import {
  buildAssetUrl,
  buildZpl,
  downloadZpl,
  generateQrDataUrl,
  printLabelHtml,
} from '@/lib/asset-label'
import type { Computer, Sector } from '@/lib/types'

export interface ComputerLabelTabProps {
  computer: Computer
  sector?: Sector
}

export function ComputerLabelTab({ computer, sector }: ComputerLabelTabProps) {
  const [zplDpi, setZplDpi] = React.useState<203 | 300>(203)
  const sectorName = sector?.name ?? 'Setor Geral'
  const assetUrl = React.useMemo(() => buildAssetUrl(computer.id), [computer.id])

  const labelData = React.useMemo(
    () => ({
      assetTag: computer.assetTag,
      hostname: computer.hostname,
      sector: sectorName,
      employeeName: computer.assignment.employeeName,
      url: assetUrl,
    }),
    [computer, sectorName, assetUrl],
  )

  const zplCode = React.useMemo(() => buildZpl(labelData, { dpi: zplDpi }), [labelData, zplDpi])

  function handleDownloadZpl() {
    downloadZpl(zplCode, `etiqueta-${computer.assetTag.toLowerCase()}-${zplDpi}dpi.zpl`)
    toast.success('Arquivo ZPL baixado com sucesso.')
  }

  async function handlePrintLabel() {
    try {
      const qrDataUrl = await generateQrDataUrl(assetUrl, { size: 240 })
      const html = printLabelHtml(labelData, qrDataUrl)
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.open()
        printWindow.document.write(html)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
          printWindow.print()
        }, 250)
      }
    } catch {
      toast.error('Não foi possível abrir a janela de impressão.')
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Visualização da Etiqueta Física */}
      <SectionCard
        title="Etiqueta Patrimonial (50×30 mm)"
        icon={QrCode}
        description="Etiqueta padrão para identificação no chassi do computador."
        action={
          <Button type="button" size="sm" onClick={handlePrintLabel}>
            <Printer aria-hidden="true" className="size-4" />
            Imprimir etiqueta
          </Button>
        }
      >
        <div className="flex flex-col gap-6 py-4">
          <QrCodeView computer={computer} sectorName={sectorName} size={160} />

          <div className="w-full text-center text-xs text-muted-foreground">
            <p>O QR Code direciona para a ficha completa deste computador na rede interna:</p>
            <code className="mt-1 block break-all rounded bg-muted px-2 py-1 font-mono text-[11px]">
              {assetUrl}
            </code>
          </div>
        </div>
      </SectionCard>

      {/* Integração ZPL / Impressora Térmica Zebra */}
      <SectionCard
        title="Código ZPL II (Zebra)"
        icon={FileCode}
        description="Comandos de impressão nativos para impressoras térmicas (GC420t, ZD220, ZD230, etc.)."
        action={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={zplDpi === 203 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setZplDpi(203)}
            >
              203 DPI
            </Button>
            <Button
              type="button"
              variant={zplDpi === 300 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setZplDpi(300)}
            >
              300 DPI
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="relative">
            <pre className="max-h-60 overflow-x-auto rounded-lg border border-border bg-zinc-950 p-3 font-mono text-xs text-zinc-100">
              <code>{zplCode}</code>
            </pre>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Formato com acentuação UTF-8 (<code className="font-mono text-xs">^CI28</code>) e
              calibração de margens.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={handleDownloadZpl}>
              <Download aria-hidden="true" className="size-4" />
              Baixar .zpl
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
