'use client'

import * as React from 'react'
import { Download, Printer, Tags } from 'lucide-react'
import { toast } from 'sonner'

import { CopyButton } from '@/components/shared/copy-button'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  buildAssetUrl,
  buildZpl,
  downloadZpl,
  generateQrDataUrl,
  printLabelHtml,
  type AssetLabelData,
} from '@/lib/asset-label'
import type { Computer } from '@/lib/types'

export interface QrCodeViewProps {
  computer: Computer
  sectorName: string
  size?: number
}

/** Folga para o navegador renderizar a etiqueta antes de abrir a impressão. */
const PRINT_DELAY_MS = 300

function QrCodeView({ computer, sectorName, size = 176 }: QrCodeViewProps) {
  const [qrDataUrl, setQrDataUrl] = React.useState('')

  const assetUrl = React.useMemo(() => buildAssetUrl(computer.id), [computer.id])

  const labelData = React.useMemo<AssetLabelData>(
    () => ({
      assetTag: computer.assetTag,
      hostname: computer.hostname,
      sector: sectorName,
      employeeName: computer.assignment.employeeName,
      url: assetUrl,
    }),
    [assetUrl, computer.assetTag, computer.assignment.employeeName, computer.hostname, sectorName],
  )

  React.useEffect(() => {
    let active = true

    generateQrDataUrl(assetUrl, { size: size * 2 })
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl)
      })
      .catch(() => {
        if (active) toast.error('Não foi possível gerar o QR Code.')
      })

    return () => {
      active = false
    }
  }, [assetUrl, size])

  function handleDownloadPng() {
    if (qrDataUrl.length === 0) return

    const anchor = document.createElement('a')
    anchor.href = qrDataUrl
    anchor.download = `qrcode-${computer.assetTag}.png`
    anchor.rel = 'noopener'
    anchor.style.display = 'none'

    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  function handlePrintLabel() {
    if (qrDataUrl.length === 0) return

    const printWindow = window.open('', '_blank', 'width=480,height=360')
    if (!printWindow) {
      toast.error('Libere as janelas pop-up para imprimir a etiqueta.')
      return
    }

    printWindow.document.open()
    printWindow.document.write(printLabelHtml(labelData, qrDataUrl))
    printWindow.document.close()

    window.setTimeout(() => {
      printWindow.focus()
      printWindow.print()
    }, PRINT_DELAY_MS)
  }

  function handleDownloadZpl() {
    downloadZpl(buildZpl(labelData), `etiqueta-${computer.assetTag}.zpl`)
    toast.success('Arquivo ZPL gerado.')
  }

  const isReady = qrDataUrl.length > 0

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      {/* Fundo branco proposital: leitores de QR Code exigem alto contraste, inclusive no tema escuro. */}
      <div className="mx-auto shrink-0 rounded-lg bg-white p-3 shadow-[var(--shadow-card)] sm:mx-0">
        {isReady ? (
          <img
            src={qrDataUrl}
            alt={`QR Code do patrimônio ${computer.assetTag}`}
            width={size}
            height={size}
            style={{ width: size, height: size }}
            className="block"
          />
        ) : (
          <Skeleton style={{ width: size, height: size }} className="rounded-md" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-semibold tracking-tight tabular">{computer.assetTag}</p>
          <p className="truncate text-sm text-muted-foreground">{computer.hostname}</p>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Setor</dt>
            <dd className="truncate text-sm font-medium">{sectorName}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Responsável</dt>
            <dd className="truncate text-sm font-medium">
              {computer.assignment.employeeName}
            </dd>
          </div>
        </dl>

        <div className="flex items-start gap-1">
          <p className="min-w-0 flex-1 break-all text-xs text-muted-foreground">{assetUrl}</p>
          <CopyButton value={assetUrl} label="Copiar link da ficha" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadPng} disabled={!isReady}>
            <Download aria-hidden="true" className="size-4" />
            Baixar PNG
          </Button>

          <Button type="button" variant="outline" size="sm" onClick={handlePrintLabel} disabled={!isReady}>
            <Printer aria-hidden="true" className="size-4" />
            Imprimir etiqueta
          </Button>

          <Button type="button" variant="outline" size="sm" onClick={handleDownloadZpl}>
            <Tags aria-hidden="true" className="size-4" />
            Etiqueta Zebra (ZPL)
          </Button>
        </div>
      </div>
    </div>
  )
}

export { QrCodeView }
