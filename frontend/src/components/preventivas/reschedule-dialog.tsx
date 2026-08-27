'use client'

import { useEffect, useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { CalendarClock } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, isRemoteBackend } from '@/lib/api'
import { MAINTENANCE_TYPE_LABELS } from '@/lib/constants'
import { formatDate, toISODate } from '@/lib/format'
import { useRealMaintenances } from '@/lib/hooks/use-real-maintenances'
import { rescheduleSchema, type RescheduleInput } from '@/lib/schemas'
import { useVellor } from '@/lib/store'
import type { Maintenance } from '@/lib/types'

export interface RescheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  maintenance: Maintenance
  onSuccess?: () => void
}

/** Diálogo enxuto de reagendamento: resumo da ordem, nova data e motivo opcional. */
export function RescheduleDialog({
  open,
  onOpenChange,
  maintenance,
  onSuccess,
}: RescheduleDialogProps) {
  const vellor = useVellor()
  const realMaintenances = useRealMaintenances()
  const remote = isRemoteBackend()
  const today = useMemo(() => toISODate(new Date()), [])

  const form = useForm<RescheduleInput>({
    resolver: zodResolver(rescheduleSchema),
    defaultValues: {
      maintenanceId: maintenance.id,
      scheduledFor: maintenance.scheduledFor,
      reason: '',
    },
  })

  // Reabrir o diálogo para outra ordem precisa recarregar os valores do formulário.
  useEffect(() => {
    if (!open) return
    form.reset({
      maintenanceId: maintenance.id,
      scheduledFor: maintenance.scheduledFor,
      reason: '',
    })
  }, [open, maintenance.id, maintenance.scheduledFor, form])

  async function handleSubmit(values: RescheduleInput) {
    if (remote) {
      try {
        await realMaintenances.reschedule(values.maintenanceId, values.scheduledFor)
        toast.success(`Preventiva reagendada para ${formatDate(values.scheduledFor)}.`)
        onSuccess?.()
        onOpenChange(false)
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : 'Não foi possível reagendar a preventiva.',
        )
      }
      return
    }

    vellor.rescheduleMaintenance(values.maintenanceId, values.scheduledFor)
    onSuccess?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reagendar preventiva</DialogTitle>
          <DialogDescription>
            Escolha a nova data para esta ordem de serviço. O equipamento continua na fila até a
            execução.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <p className="font-medium tabular">
            {maintenance.assetTag}
            <span className="ml-2 font-normal text-muted-foreground">{maintenance.hostname}</span>
          </p>

          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 sm:justify-start">
              <dt className="text-muted-foreground">Tipo</dt>
              <dd className="font-medium">{MAINTENANCE_TYPE_LABELS[maintenance.type]}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-start">
              <dt className="text-muted-foreground">Técnico</dt>
              <dd className="truncate font-medium">{maintenance.technicianName}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-start">
              <dt className="text-muted-foreground">Data atual</dt>
              <dd className="font-medium tabular">{formatDate(maintenance.scheduledFor)}</dd>
            </div>
          </dl>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-5">
            <FormField
              control={form.control}
              name="scheduledFor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova data</FormLabel>
                  <FormControl>
                    <Input type="date" min={today} className="tabular" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Ex.: colaborador em férias, equipamento em uso na operação..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Ajuda o time a entender por que a data mudou.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Voltar
                </Button>
              </DialogClose>
              <Button type="submit">
                <CalendarClock aria-hidden="true" />
                Confirmar novo agendamento
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
