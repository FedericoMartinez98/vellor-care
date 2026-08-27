'use client'

/**
 * Detalhe completo de uma ordem de serviço: checklist, peças, fotos e
 * assinatura do técnico — com layout preparado para impressão.
 */

import * as React from 'react'
import { CheckCircle2, Circle, Printer } from 'lucide-react'

import { InfoList, MaintenanceStatusBadge, PriorityBadge } from '@/components/shared'
import type { InfoListItem } from '@/components/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CHECKLIST_DEFINITIONS,
  CHECKLIST_GROUP_LABELS,
  MAINTENANCE_TYPE_LABELS,
} from '@/lib/constants'
import { formatCurrency, formatDateTime, formatDuration, formatNumber } from '@/lib/format'
import { isRemoteBackend } from '@/lib/api'
import { useRealInventory } from '@/lib/hooks/use-real-inventory'
import { useVellor } from '@/lib/store'
import { checklistCompletion, effectiveMaintenanceStatus } from '@/lib/status'
import type {
  ChecklistGroup,
  Maintenance,
  MaintenanceChecklistItem,
  MaintenancePhoto,
} from '@/lib/types'

export interface MaintenanceDetailDialogProps {
  maintenance?: Maintenance
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Ordem em que os grupos do checklist são apresentados. */
const CHECKLIST_GROUP_ORDER: ChecklistGroup[] = [
  'LIMPEZA',
  'TERMICA',
  'PERIFERICOS',
  'TESTES',
  'SOFTWARE',
  'MEDICOES',
]

/** Unidade de medida de cada item mensurável, indexada pela chave do checklist. */
const MEASUREMENT_UNITS: Record<string, string> = Object.fromEntries(
  CHECKLIST_DEFINITIONS.filter((definition) => definition.measurement).map((definition) => [
    definition.key,
    definition.measurement?.unit ?? '',
  ]),
)

function checklistItemLabel(item: MaintenanceChecklistItem): string {
  if (item.value === undefined) return item.label
  const unit = MEASUREMENT_UNITS[item.key] ?? ''
  return `${item.label} — ${formatNumber(item.value, 1)}${unit ? ` ${unit}` : ''}`
}

function PhotoGrid({ title, photos }: { title: string; photos: MaintenancePhoto[] }) {
  if (photos.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo) => (
          <figure key={photo.id} className="overflow-hidden rounded-lg border border-border">
            {/* Fotos chegam como data-URL do próprio aparelho do técnico. */}
            <img
              src={photo.url}
              alt={photo.caption ?? title}
              className="block aspect-video w-full object-cover"
            />
            {photo.caption ? (
              <figcaption className="truncate px-2 py-1 text-xs text-muted-foreground">
                {photo.caption}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </div>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      {children}
    </section>
  )
}

function MaintenanceDetailDialog({
  maintenance,
  open,
  onOpenChange,
}: MaintenanceDetailDialogProps) {
  const vellor = useVellor()
  const realInv = useRealInventory()
  const remote = isRemoteBackend()

  const grouped = React.useMemo(() => {
    const checklist = maintenance?.checklist ?? []
    return CHECKLIST_GROUP_ORDER.map((group) => ({
      group,
      items: checklist.filter((item) => item.group === group),
    })).filter((entry) => entry.items.length > 0)
  }, [maintenance])

  if (!maintenance) return null

  const status = effectiveMaintenanceStatus(maintenance)
  const completion = checklistCompletion(maintenance.checklist)
  const referenceDate =
    maintenance.finishedAt ?? maintenance.startedAt ?? maintenance.scheduledFor

  const photosBefore = maintenance.photos.filter((photo) => photo.moment === 'ANTES')
  const photosAfter = maintenance.photos.filter((photo) => photo.moment === 'DEPOIS')

  const partsTotal = maintenance.parts.reduce(
    (total, part) => total + part.quantity * (part.unitCost ?? 0),
    0,
  )

  const infoItems: InfoListItem[] = [
    { label: 'Técnico', value: maintenance.technicianName },
    {
      label: 'Computador',
      value: `${maintenance.assetTag} · ${maintenance.hostname}`,
    },
    {
      label: 'Setor',
      value: remote
        ? (realInv.sectors.find((s) => s.id === maintenance.sectorId)?.name ?? '—')
        : vellor.getSectorName(maintenance.sectorId),
    },
    {
      label: 'Agendada para',
      value: <span className="tabular">{formatDateTime(maintenance.scheduledFor)}</span>,
    },
    {
      label: 'Iniciada em',
      value: maintenance.startedAt ? (
        <span className="tabular">{formatDateTime(maintenance.startedAt)}</span>
      ) : null,
    },
    {
      label: 'Finalizada em',
      value: maintenance.finishedAt ? (
        <span className="tabular">{formatDateTime(maintenance.finishedAt)}</span>
      ) : null,
    },
    {
      label: 'Duração',
      value:
        maintenance.durationMinutes === undefined ? null : (
          <span className="tabular">{formatDuration(maintenance.durationMinutes)}</span>
        ),
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl print:[&_[data-slot=dialog-close-button]]:hidden">
        <DialogHeader>
          <DialogTitle>
            {MAINTENANCE_TYPE_LABELS[maintenance.type]} — {maintenance.assetTag}
          </DialogTitle>
          <DialogDescription>{formatDateTime(referenceDate)}</DialogDescription>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <MaintenanceStatusBadge status={status} />
            <PriorityBadge priority={maintenance.priority} />
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <InfoList items={infoItems} columns={2} />

          {completion.total > 0 ? (
            <Block title="Checklist">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Itens concluídos</span>
                  <span className="tabular">
                    {completion.done} de {completion.total} itens
                  </span>
                </div>
                <Progress
                  value={completion.percent}
                  aria-label="Percentual do checklist concluído"
                />
              </div>

              <div className="flex flex-col gap-4">
                {grouped.map((entry) => (
                  <div key={entry.group} className="flex flex-col gap-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {CHECKLIST_GROUP_LABELS[entry.group]}
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {entry.items.map((item) => (
                        <li key={item.key} className="flex items-start gap-2 text-sm">
                          {item.done ? (
                            <CheckCircle2
                              aria-hidden="true"
                              className="mt-0.5 size-4 shrink-0 text-success"
                            />
                          ) : (
                            <Circle
                              aria-hidden="true"
                              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                            />
                          )}
                          <span className={item.done ? undefined : 'text-muted-foreground'}>
                            {checklistItemLabel(item)}
                            {item.note ? (
                              <span className="block text-xs text-muted-foreground">
                                {item.note}
                              </span>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Block>
          ) : null}

          {maintenance.parts.length > 0 ? (
            <Block title="Peças utilizadas">
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Peça</TableHead>
                      <TableHead className="text-right">Qtd.</TableHead>
                      <TableHead className="text-right">Custo unitário</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenance.parts.map((part) => (
                      <TableRow key={part.partId}>
                        <TableCell className="font-medium">{part.partName}</TableCell>
                        <TableCell className="text-right tabular">
                          {formatNumber(part.quantity)}
                        </TableCell>
                        <TableCell className="text-right tabular">
                          {formatCurrency(part.unitCost)}
                        </TableCell>
                        <TableCell className="text-right tabular">
                          {formatCurrency(part.quantity * (part.unitCost ?? 0))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3}>Total em peças</TableCell>
                      <TableCell className="text-right tabular">
                        {formatCurrency(partsTotal)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </Block>
          ) : null}

          {maintenance.notes ? (
            <Block title="Observações">
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {maintenance.notes}
              </p>
            </Block>
          ) : null}

          {maintenance.photos.length > 0 ? (
            <Block title="Fotos">
              <PhotoGrid title="Antes" photos={photosBefore} />
              <PhotoGrid title="Depois" photos={photosAfter} />
            </Block>
          ) : null}

          {maintenance.signatureDataUrl ? (
            <Block title="Assinatura do técnico">
              {/* Fundo branco proposital: a assinatura é traçada em tinta escura. */}
              <div className="rounded-lg border border-border bg-white p-3">
                <img
                  src={maintenance.signatureDataUrl}
                  alt={`Assinatura de ${maintenance.technicianName}`}
                  className="mx-auto block max-h-40 w-auto"
                />
              </div>
              <Badge variant="muted" className="w-fit">
                {maintenance.technicianName}
              </Badge>
            </Block>
          ) : null}
        </div>

        <DialogFooter className="no-print">
          {status === 'CONCLUIDA' ? (
            <Button type="button" variant="outline" onClick={() => window.print()}>
              <Printer aria-hidden="true" className="size-4" />
              Imprimir
            </Button>
          ) : null}

          <Button type="button" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { MaintenanceDetailDialog }
