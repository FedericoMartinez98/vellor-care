'use client'

/**
 * Aba "Visão geral" da ficha: hardware, sistema, garantia, responsável e o
 * ciclo de preventiva do equipamento.
 */

import * as React from 'react'
import { differenceInMonths } from 'date-fns'
import { Cpu, FileText, MonitorCog, ShieldCheck, StickyNote, TriangleAlert, User } from 'lucide-react'

import { CopyButton, InfoList, SectionCard, SectorBadge } from '@/components/shared'
import type { InfoListItem } from '@/components/shared'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { STORAGE_TYPE_LABELS } from '@/lib/constants'
import {
  daysBetween,
  daysUntil,
  formatBytesGb,
  formatCurrency,
  formatDate,
  formatNumber,
  initials,
  parseISODate,
} from '@/lib/format'
import { computerIsCritical, criticalReasons, preventiveHealthOf } from '@/lib/status'
import type { Computer, PreventiveHealth, Sector } from '@/lib/types'

export interface ComputerOverviewProps {
  computer: Computer
  sector?: Sector
}

/** Classes escritas por extenso: o Tailwind não detecta classe montada em template string. */
const HEALTH_INDICATOR: Record<PreventiveHealth, string> = {
  EM_DIA: 'bg-success',
  PROXIMA: 'bg-warning',
  ATRASADA: 'bg-danger',
}

/** Idade do equipamento em anos e meses a partir da data de aquisição. */
function formatEquipmentAge(acquisitionDate?: string): string {
  if (!acquisitionDate) return '—'

  const acquired = parseISODate(acquisitionDate)
  if (Number.isNaN(acquired.getTime())) return '—'

  const months = Math.max(0, differenceInMonths(new Date(), acquired))
  const years = Math.floor(months / 12)
  const restMonths = months % 12

  const yearsLabel = years === 1 ? '1 ano' : `${years} anos`
  const monthsLabel = restMonths === 1 ? '1 mês' : `${restMonths} meses`

  if (years > 0 && restMonths > 0) return `${yearsLabel} e ${monthsLabel}`
  if (years > 0) return yearsLabel
  if (restMonths > 0) return monthsLabel
  return 'Menos de 1 mês'
}

/** Valor de texto acompanhado do botão de copiar. */
function CopyableValue({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="min-w-0 break-all">{value}</span>
      <CopyButton value={value} label={label} className="-my-1.5" />
    </span>
  )
}

function WarrantyValue({ warrantyUntil }: { warrantyUntil?: string }) {
  const remainingDays = daysUntil(warrantyUntil)

  if (!warrantyUntil || remainingDays === null) return <span>—</span>

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="tabular">{formatDate(warrantyUntil)}</span>
      {remainingDays < 0 ? (
        <Badge variant="danger">Vencida</Badge>
      ) : (
        <Badge variant={remainingDays <= 30 ? 'warning' : 'success'}>
          {remainingDays === 1 ? '1 dia restante' : `${formatNumber(remainingDays)} dias restantes`}
        </Badge>
      )}
    </span>
  )
}

function ComputerOverview({ computer, sector }: ComputerOverviewProps) {
  const { hardware, system, warranty, assignment } = computer

  const health = preventiveHealthOf(computer)
  const reasons = React.useMemo(
    () => (computerIsCritical(computer) ? criticalReasons(computer) : []),
    [computer],
  )

  const hardwareItems: InfoListItem[] = [
    { label: 'Processador', value: hardware.processor },
    {
      label: 'Memória RAM',
      value: hardware.ramDetail ? (
        <span className="flex flex-col">
          <span className="tabular">{formatBytesGb(hardware.ramGb)}</span>
          <span className="text-xs font-normal text-muted-foreground">{hardware.ramDetail}</span>
        </span>
      ) : (
        <span className="tabular">{formatBytesGb(hardware.ramGb)}</span>
      ),
    },
    {
      label: 'Armazenamento',
      value: (
        <span className="flex flex-col">
          <span className="tabular">
            {formatBytesGb(hardware.storageGb)} · {STORAGE_TYPE_LABELS[hardware.storageType]}
          </span>
          {hardware.storageDetail ? (
            <span className="text-xs font-normal text-muted-foreground">
              {hardware.storageDetail}
            </span>
          ) : null}
        </span>
      ),
    },
    { label: 'Placa de vídeo', value: hardware.gpu },
    { label: 'Fonte', value: hardware.powerSupply },
    { label: 'Placa-mãe', value: hardware.motherboard },
    {
      label: 'Data de aquisição',
      value: <span className="tabular">{formatDate(hardware.acquisitionDate)}</span>,
    },
    { label: 'Idade do equipamento', value: formatEquipmentAge(hardware.acquisitionDate) },
  ]

  const systemItems: InfoListItem[] = [
    { label: 'Windows', value: system.windowsVersion },
    { label: 'Build', value: <span className="tabular">{system.windowsBuild}</span> },
    { label: 'Office', value: system.officeVersion },
    { label: 'Antivírus', value: system.antivirus },
    {
      label: 'Última atualização',
      value: <span className="tabular">{formatDate(system.lastWindowsUpdate)}</span>,
    },
    {
      label: 'Ingressado no domínio',
      value: (
        <Badge variant={system.domainJoined ? 'success' : 'muted'}>
          {system.domainJoined ? 'Sim' : 'Não'}
        </Badge>
      ),
    },
  ]

  const identificationItems: InfoListItem[] = [
    {
      label: 'Patrimônio',
      value: <CopyableValue value={computer.assetTag} label="Copiar patrimônio" />,
    },
    {
      label: 'Hostname',
      value: <CopyableValue value={computer.hostname} label="Copiar hostname" />,
    },
    {
      label: 'Número de série',
      value: <CopyableValue value={computer.serialNumber} label="Copiar número de série" />,
    },
    { label: 'Fornecedor', value: warranty.supplier },
    { label: 'Nota fiscal', value: warranty.invoiceNumber },
    { label: 'Garantia até', value: <WarrantyValue warrantyUntil={warranty.warrantyUntil} /> },
    {
      label: 'Valor de aquisição',
      value: <span className="tabular">{formatCurrency(warranty.purchaseValue)}</span>,
    },
  ]

  const interval = computer.maintenanceIntervalDays
  const elapsedDays = computer.lastMaintenanceAt
    ? Math.max(0, daysBetween(computer.lastMaintenanceAt, new Date()))
    : null
  const cyclePercent =
    elapsedDays !== null && interval > 0
      ? Math.min(100, Math.round((elapsedDays / interval) * 100))
      : 0

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <SectionCard title="Hardware" icon={Cpu} description="Configuração física do equipamento.">
          <InfoList items={hardwareItems} columns={2} />
        </SectionCard>

        <SectionCard
          title="Sistema"
          icon={MonitorCog}
          description="Sistema operacional, aplicativos e proteção."
        >
          <InfoList items={systemItems} columns={2} />
        </SectionCard>

        <SectionCard
          title="Identificação e garantia"
          icon={FileText}
          description="Dados patrimoniais e cobertura do fornecedor."
        >
          <InfoList items={identificationItems} columns={2} />
        </SectionCard>
      </div>

      <div className="flex flex-col gap-4">
        {reasons.length > 0 ? (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden="true" />
            <AlertTitle>Equipamento crítico</AlertTitle>
            <AlertDescription>
              <ul className="list-disc space-y-1 pl-4">
                {reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        <SectionCard title="Responsável" icon={User}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarFallback className="text-sm">
                  {initials(assignment.employeeName)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p className="truncate font-medium">{assignment.employeeName}</p>
                <p className="truncate text-sm text-muted-foreground">{assignment.unit}</p>
              </div>
            </div>

            <InfoList
              columns={1}
              items={[
                {
                  label: 'E-mail',
                  value: (
                    <CopyableValue value={assignment.employeeEmail} label="Copiar e-mail" />
                  ),
                },
                { label: 'Setor', value: <SectorBadge sector={sector} /> },
                { label: 'Unidade', value: assignment.unit },
                { label: 'Localização', value: assignment.location },
              ]}
            />
          </div>
        </SectionCard>

        <SectionCard title="Preventiva" icon={ShieldCheck}>
          <div className="flex flex-col gap-4">
            <InfoList
              columns={2}
              items={[
                {
                  label: 'Intervalo',
                  value: <span className="tabular">{formatNumber(interval)} dias</span>,
                },
                {
                  label: 'Ciclo decorrido',
                  value: (
                    <span className="tabular">
                      {elapsedDays === null ? '—' : `${formatNumber(elapsedDays)} dias`}
                    </span>
                  ),
                },
                {
                  label: 'Última',
                  value: computer.lastMaintenanceAt ? (
                    <span className="tabular">{formatDate(computer.lastMaintenanceAt)}</span>
                  ) : null,
                },
                {
                  label: 'Próxima',
                  value: computer.nextMaintenanceAt ? (
                    <span className="tabular">{formatDate(computer.nextMaintenanceAt)}</span>
                  ) : null,
                },
              ]}
            />

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Ciclo da preventiva</span>
                <span className="tabular">{cyclePercent}%</span>
              </div>
              <Progress
                value={cyclePercent}
                indicatorClassName={HEALTH_INDICATOR[health]}
                aria-label="Percentual do ciclo de preventiva já decorrido"
              />
              <p className="text-xs text-muted-foreground">
                {elapsedDays === null
                  ? 'Nenhuma manutenção registrada até agora.'
                  : `${formatNumber(elapsedDays)} de ${formatNumber(interval)} dias do ciclo.`}
              </p>
            </div>
          </div>
        </SectionCard>

        {computer.notes ? (
          <SectionCard title="Observações" icon={StickyNote}>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{computer.notes}</p>
          </SectionCard>
        ) : null}
      </div>
    </div>
  )
}

export { ComputerOverview }
