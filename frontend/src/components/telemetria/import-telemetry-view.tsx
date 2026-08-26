'use client'

import * as React from 'react'
import { CheckCircle2, FileUp, Loader2, TriangleAlert, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { computersApi, type TelemetryCsvImportResult } from '@/lib/api'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'

/**
 * Importa o .csv gerado pelo coletor Windows (`agent/vellor-agent.ps1`). Cada
 * linha vira um snapshot de saúde para o computador correspondente — o
 * computador precisa já estar cadastrado (casado por assetTag ou hostname).
 *
 * Chama o backend de verdade via `computersApi.importTelemetryCsv`, sem
 * passar pelo store local de demonstração.
 */
function ImportTelemetryView() {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<TelemetryCsvImportResult | null>(null)

  async function upload(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Selecione um arquivo .csv — o mesmo gerado pelo coletor Windows.')
      return
    }

    setIsUploading(true)
    setFileName(file.name)
    setResult(null)

    try {
      const response = await computersApi.importTelemetryCsv(file)
      setResult(response)

      if (response.created > 0) {
        toast.success(`${response.created} computador(es) novo(s) cadastrado(s) automaticamente.`)
      }
      if (response.updated > 0) {
        toast.success(`${response.updated} computador(es) existente(s) atualizado(s).`)
      }
      if (response.errors.length > 0) {
        toast.error(`${response.errors.length} linha(s) não puderam ser importadas.`)
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Falha ao enviar o arquivo.'
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
  }

  function openPicker() {
    if (isUploading) return
    inputRef.current?.click()
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void upload(file)
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    if (isUploading) return
    const file = event.dataTransfer.files?.[0]
    if (file) void upload(file)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={UploadCloud}
        title="Importar telemetria"
        description="Suba o .csv gerado pelo coletor Windows (agent/vellor-agent.ps1) para registrar a saúde dos equipamentos já cadastrados."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Arquivo .csv</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            tabIndex={-1}
            disabled={isUploading}
            onChange={handleInputChange}
          />

          <div
            role="button"
            tabIndex={isUploading ? -1 : 0}
            aria-disabled={isUploading}
            aria-label="Selecionar arquivo CSV de telemetria"
            onClick={openPicker}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openPicker()
              }
            }}
            onDragOver={(event) => {
              event.preventDefault()
              if (!isUploading) setIsDragging(true)
            }}
            onDragLeave={(event) => {
              event.preventDefault()
              setIsDragging(false)
            }}
            onDrop={handleDrop}
            className={cn(
              'focus-ring flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors',
              isUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-primary/50',
              isDragging && !isUploading && 'border-primary/50 bg-primary-soft/40',
            )}
          >
            {isUploading ? (
              <Loader2 aria-hidden="true" className="size-6 animate-spin text-muted-foreground" />
            ) : (
              <FileUp aria-hidden="true" className="size-6 text-muted-foreground" />
            )}
            <p className="mt-2 text-sm font-medium">
              {isUploading
                ? `Enviando ${fileName ?? 'arquivo'}...`
                : 'Arraste o .csv ou clique para selecionar'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Gerado ao rodar vellor-agent.ps1 na máquina do usuário
            </p>
          </div>

          <Button type="button" variant="outline" onClick={openPicker} disabled={isUploading}>
            <FileUp aria-hidden="true" />
            Selecionar arquivo
          </Button>
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {result.errors.length === 0 ? (
                <CheckCircle2 aria-hidden="true" className="size-5 text-success" />
              ) : (
                <TriangleAlert aria-hidden="true" className="size-5 text-warning" />
              )}
              Resultado da importação — {fileName}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {result.created + result.updated} de {result.totalRows} linha(s) processada(s) —{' '}
              {result.created} novo(s) computador(es) cadastrado(s), {result.updated} atualizado(s).
            </p>

            {result.errors.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Linha</TableHead>
                      <TableHead>Patrimônio</TableHead>
                      <TableHead>Hostname</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.errors.map((error) => (
                      <TableRow key={error.line}>
                        <TableCell className="tabular">{error.line}</TableCell>
                        <TableCell>{error.assetTag ?? '—'}</TableCell>
                        <TableCell>{error.hostname ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{error.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

export { ImportTelemetryView }
