'use client'

/**
 * Aba "Saúde": indicadores de telemetria em tempo real ou última coleta manual/agente.
 * Exibe SMART do SSD, temperaturas, uso de CPU/RAM, armazenamento e uptime.
 */

import * as React from 'react'
import { Activity, Thermometer } from 'lucide-react'

import { HealthRing, type HealthRingTone } from '@/components/charts/health-ring'
import { SectionCard } from '@/components/shared'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  CRITICAL_SSD_HEALTH_PERCENT,
  CRITICAL_TEMP_C,
  LOW_DISK_FREE_PERCENT,
} from '@/lib/constants'
import {
  formatBytesGb,
  formatDate,
  formatDuration,
  formatNumber,
  formatPercent,
  formatRelative,
} from '@/lib/format'
import type { Computer } from '@/lib/types'

export interface ComputerHealthTabProps {
  computer: Computer
}

function MetricCard({
  title,
  value,
  status = 'default',
  description,
  children,
}: {
  title: string
  value: string | React.ReactNode
  status?: 'success' | 'warning' | 'danger' | 'default'
  description?: string
  children?: React.ReactNode
}) {
  const borderColors = {
    success: 'border-success/30 bg-success/5',
    warning: 'border-warning/30 bg-warning/5',
    danger: 'border-danger/30 bg-danger/5',
    default: 'border-border bg-card',
  }

  return (
    <div className={`rounded-xl border p-4 transition-all ${borderColors[status]}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <div className="text-2xl font-bold tabular">{value}</div>
        {children}
      </div>
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

export function ComputerHealthTab({ computer }: ComputerHealthTabProps) {
  const latest = computer.health

  if (!latest) {
    return (
      <div className="surface-card p-12 text-center">
        <Activity className="mx-auto size-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-base font-semibold">Nenhuma telemetria registrada</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          As informações de saúde serão atualizadas automaticamente quando o agente de telemetria
          postar coletas ou na conclusão da próxima manutenção preventiva.
        </p>
      </div>
    )
  }

  const isSsdCritical = latest.ssdHealthPercent < CRITICAL_SSD_HEALTH_PERCENT
  const isCpuTempCritical = latest.cpuTempC >= CRITICAL_TEMP_C
  const isDiskLow = latest.diskFreePercent <= LOW_DISK_FREE_PERCENT

  const ssdTone: HealthRingTone = isSsdCritical ? 'danger' : latest.ssdHealthPercent < 50 ? 'warning' : 'success'
  const diskTone: HealthRingTone = isDiskLow ? 'danger' : latest.diskFreePercent < 25 ? 'warning' : 'success'

  return (
    <div className="flex flex-col gap-6">
      {/* Alertas de saúde ativos */}
      {isSsdCritical || isCpuTempCritical || isDiskLow ? (
        <Alert variant="destructive">
          <AlertTitle className="font-semibold">Atenção aos indicadores de saúde</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
              {isSsdCritical ? (
                <li>
                  Saúde do SSD em <strong>{formatPercent(latest.ssdHealthPercent)}</strong> — risco
                  iminente de falha de hardware.
                </li>
              ) : null}
              {isCpuTempCritical ? (
                <li>
                  Temperatura da CPU em <strong>{latest.cpuTempC}°C</strong> — verifique cooler e
                  pasta térmica.
                </li>
              ) : null}
              {isDiskLow ? (
                <li>
                  Espaço livre em disco muito baixo (
                  <strong>{formatPercent(latest.diskFreePercent)}</strong> restantes).
                </li>
              ) : null}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Visão de Anéis e Indicadores Principais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-card flex flex-col items-center justify-center p-6 text-center">
          <HealthRing
            value={latest.ssdHealthPercent}
            label="Saúde SSD"
            sublabel={latest.ssdPowerOnHours ? `${formatNumber(latest.ssdPowerOnHours)}h de uso` : undefined}
            tone={ssdTone}
          />
        </div>

        <div className="surface-card flex flex-col items-center justify-center p-6 text-center">
          <HealthRing
            value={latest.cpuUsagePercent}
            label="Uso de CPU"
            sublabel={`${latest.cpuTempC}°C`}
            tone={latest.cpuUsagePercent > 90 ? 'danger' : 'success'}
          />
        </div>

        <div className="surface-card flex flex-col items-center justify-center p-6 text-center">
          <HealthRing
            value={latest.ramUsagePercent}
            label="Uso de RAM"
            sublabel={`${formatBytesGb(computer.hardware.ramGb)} total`}
            tone={latest.ramUsagePercent > 90 ? 'warning' : 'success'}
          />
        </div>

        <div className="surface-card flex flex-col items-center justify-center p-6 text-center">
          <HealthRing
            value={100 - latest.diskFreePercent}
            label="Uso de Disco"
            sublabel={`${formatBytesGb(latest.diskFreeGb)} livres`}
            tone={diskTone}
          />
        </div>
      </div>

      {/* Detalhamento de métricas */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Temperaturas e Desempenho"
          icon={Thermometer}
          description="Leituras térmicas dos componentes principais."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              title="Temperatura CPU"
              value={`${latest.cpuTempC} °C`}
              status={isCpuTempCritical ? 'danger' : latest.cpuTempC > 75 ? 'warning' : 'success'}
              description={latest.cpuTempC > 85 ? 'Temperatura crítica' : 'Dentro do limite seguro'}
            />

            <MetricCard
              title="Temperatura SSD"
              value={`${latest.ssdTempC} °C`}
              status={latest.ssdTempC > 70 ? 'danger' : 'success'}
              description={latest.ssdTempC > 70 ? 'Superaquecimento' : 'Normal'}
            />

            {latest.gpuTempC !== undefined ? (
              <MetricCard
                title="Temperatura GPU"
                value={`${latest.gpuTempC} °C`}
                status={latest.gpuTempC > 85 ? 'warning' : 'success'}
              />
            ) : null}

            <MetricCard
              title="Uptime / Ligado"
              value={formatDuration(latest.uptimeHours * 60)}
              description={
                latest.lastBootAt
                  ? `Último boot: ${formatDate(latest.lastBootAt)}`
                  : undefined
              }
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Origem da Telemetria"
          icon={Activity}
          description="Dados de coleta e integridade do monitoramento."
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-medium">Última leitura registrada</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(latest.collectedAt)} ({formatRelative(latest.collectedAt)})
                </p>
              </div>
              <Badge variant={latest.source === 'AGENTE' ? 'success' : 'secondary'}>
                {latest.source === 'AGENTE' ? 'Agente Windows' : 'Coleta Manual'}
              </Badge>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground space-y-2">
              <p>
                <strong>Disco Livre:</strong> {formatBytesGb(latest.diskFreeGb)} ({formatPercent(latest.diskFreePercent)})
              </p>
              <p>
                <strong>Horas de Uso do SSD:</strong> {latest.ssdPowerOnHours ? `${formatNumber(latest.ssdPowerOnHours)} horas` : 'N/A'}
              </p>
              <p>
                <strong>Última Inicialização:</strong> {latest.lastBootAt ? formatDate(latest.lastBootAt) : 'N/A'}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
