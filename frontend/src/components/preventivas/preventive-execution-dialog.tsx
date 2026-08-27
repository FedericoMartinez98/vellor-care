'use client'

/**
 * Dialog de Execução de Manutenção Preventiva:
 * - Checklist de 21 itens com medições e observações por grupo
 * - Seleção e baixa de peças no estoque
 * - Upload de fotos antes e depois
 * - Cronômetro de tempo gasto
 * - Assinatura digital do técnico
 * - Conclusão atômica da ordem no DataProvider
 */

import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
  Camera,
  CheckCircle2,
  FileSignature,
  Package,
  Sparkles,
  Timer,
} from 'lucide-react'
import { toast } from 'sonner'

import { ChecklistGroupCard, type ChecklistFieldEntry } from '@/components/preventivas/checklist-group'
import { ChecklistPartsPicker } from '@/components/preventivas/checklist-parts-picker'
import { PhotoUploader, SectionCard, SignaturePad } from '@/components/shared'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, isRemoteBackend } from '@/lib/api'
import { toMaintenanceCompleteBody } from '@/lib/api/maintenance-mappers'
import { CHECKLIST_DEFINITIONS } from '@/lib/constants'
import { formatDuration } from '@/lib/format'
import { useRealAuth } from '@/lib/hooks/use-real-auth'
import { useRealMaintenances } from '@/lib/hooks/use-real-maintenances'
import { checklistFormSchema, type ChecklistFormInput } from '@/lib/schemas'
import { useVellor } from '@/lib/store'
import type { ChecklistGroup, Computer, Maintenance, MaintenanceChecklistItem } from '@/lib/types'

export interface PreventiveExecutionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  maintenance?: Maintenance
  computer?: Computer
  onSuccess?: () => void
}

const CHECKLIST_GROUPS: ChecklistGroup[] = [
  'LIMPEZA',
  'TERMICA',
  'PERIFERICOS',
  'TESTES',
  'SOFTWARE',
  'MEDICOES',
]

export function PreventiveExecutionDialog({
  open,
  onOpenChange,
  maintenance,
  computer,
  onSuccess,
}: PreventiveExecutionDialogProps) {
  const { completeMaintenance, createMaintenance } = useVellor()
  const realMaintenances = useRealMaintenances()
  const realAuth = useRealAuth()
  const remote = isRemoteBackend()
  const [timerSeconds, setTimerSeconds] = React.useState<number>(0)
  const [timerActive, setTimerActive] = React.useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  // O cronômetro só preenche a duração enquanto o técnico não digitar um valor
  // próprio -- antes ele sobrescrevia o campo a cada segundo, tornando
  // impossível corrigir o tempo manualmente.
  const durationTouchedRef = React.useRef(false)

  // Cronômetro da manutenção
  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (open && timerActive) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [open, timerActive])

  const initialItems = React.useMemo(() => {
    if (maintenance?.checklist && maintenance.checklist.length > 0) {
      return maintenance.checklist.map((item) => ({
        key: item.key,
        label: item.label,
        group: item.group,
        done: item.done,
        value: item.value,
        note: item.note ?? '',
      }))
    }

    return CHECKLIST_DEFINITIONS.map((def) => ({
      key: def.key,
      label: def.label,
      group: def.group,
      done: false,
      value: undefined,
      note: '',
    }))
  }, [maintenance])

  const form = useForm<ChecklistFormInput>({
    resolver: zodResolver(checklistFormSchema),
    defaultValues: {
      items: initialItems,
      durationMinutes: 45,
      parts: [],
      signatureDataUrl: '',
      photosBefore: [],
      photosAfter: [],
      notes: '',
    },
  })

  // Sincroniza o cronômetro no form
  React.useEffect(() => {
    if (timerSeconds > 0 && !durationTouchedRef.current) {
      const minutes = Math.max(1, Math.round(timerSeconds / 60))
      form.setValue('durationMinutes', minutes)
    }
  }, [timerSeconds, form])

  // Reseta ao abrir
  React.useEffect(() => {
    if (open) {
      setTimerSeconds(0)
      setTimerActive(true)
      durationTouchedRef.current = false
      form.reset({
        items: initialItems,
        durationMinutes: 45,
        parts: [],
        signatureDataUrl: '',
        photosBefore: [],
        photosAfter: [],
        notes: '',
      })
    }
  }, [open, initialItems, form])

  const watchedItems = form.watch('items')

  // Resolve os itens por grupo para os componentes ChecklistGroupCard
  function getGroupFields(group: ChecklistGroup): ChecklistFieldEntry[] {
    return watchedItems
      .map((item, index) => {
        const def = CHECKLIST_DEFINITIONS.find((d) => d.key === item.key)
        return {
          id: `${item.key}-${index}`,
          index,
          itemKey: item.key,
          label: item.label,
          done: item.done,
          hasNote: Boolean(item.note),
          measurement: def?.measurement,
        }
      })
      .filter((entry) => watchedItems[entry.index].group === (group as string))
  }

  function handleMarkAllDone() {
    // Marca só o "feito" -- NÃO preenche os valores medidos. Antes isso
    // inventava medições fixas (45% de disco, 48°C de CPU, 39°C de SSD) que
    // iam para o histórico e os relatórios como se tivessem sido medidas de
    // verdade. Com o registro persistindo no banco real, isso viraria dado
    // falso na ficha do equipamento.
    const updated = watchedItems.map((item) => ({ ...item, done: true }))
    form.setValue('items', updated)

    const pendingMeasurements = updated.filter(
      (item) =>
        item.group === 'MEDICOES' && (item.value === undefined || Number.isNaN(item.value)),
    ).length

    if (pendingMeasurements > 0) {
      toast.warning(
        `Itens marcados. Informe ${pendingMeasurements} valor(es) medido(s) na aba Checklist antes de concluir.`,
      )
      return
    }
    toast.success('Todos os itens foram marcados como concluídos.')
  }

  async function onSubmit(values: ChecklistFormInput) {
    const domainChecklist: MaintenanceChecklistItem[] = values.items.map((it) => ({
      key: it.key,
      label: it.label,
      group: it.group as ChecklistGroup,
      done: it.done,
      value: it.value,
      note: it.note,
    }))

    setIsSubmitting(true)
    try {
      if (remote) {
        // O técnico é quem está logado -- antes isso era um UUID de mock fixo
        // no código, que o backend real rejeitaria ("Técnico não encontrado").
        const technician = realAuth.user
        if (!technician) {
          toast.error('Sessão expirada. Entre novamente para registrar a manutenção.')
          return
        }

        let targetId = maintenance?.id
        if (!targetId) {
          if (!computer) {
            toast.error('Selecione o equipamento da manutenção.')
            return
          }
          const created = await realMaintenances.create({
            computerId: computer.id,
            technicianId: technician.id,
            type: 'PREVENTIVA',
            priority: 'MEDIA',
            scheduledFor: new Date().toISOString().slice(0, 10),
            notes: values.notes,
          })
          targetId = created.id
        }

        await realMaintenances.complete(
          targetId,
          toMaintenanceCompleteBody({
            checklist: domainChecklist,
            parts: values.parts,
            photosBefore: values.photosBefore,
            photosAfter: values.photosAfter,
            durationMinutes: values.durationMinutes,
            notes: values.notes,
            signatureDataUrl: values.signatureDataUrl,
          }),
        )

        toast.success('Manutenção preventiva concluída com sucesso!')
        onSuccess?.()
        onOpenChange(false)
        return
      }

      let targetMaintenanceId = maintenance?.id

      if (!targetMaintenanceId && computer) {
        const newMaint = createMaintenance({
          computerId: computer.id,
          technicianId: 'u1000000-0000-4000-8000-000000000002',
          type: 'PREVENTIVA',
          priority: 'MEDIA',
          scheduledFor: new Date().toISOString().slice(0, 10),
          notes: values.notes,
        })
        targetMaintenanceId = newMaint.id
      }

      if (!targetMaintenanceId) {
        throw new Error('Identificação da manutenção não encontrada.')
      }

      completeMaintenance(targetMaintenanceId, {
        checklist: domainChecklist,
        durationMinutes: values.durationMinutes,
        signatureDataUrl: values.signatureDataUrl,
        notes: values.notes,
        parts: values.parts,
        photosBefore: values.photosBefore,
        photosAfter: values.photosAfter,
      })

      toast.success('Manutenção preventiva concluída com sucesso!')
      onSuccess?.()
      onOpenChange(false)
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao concluir a manutenção.'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const assetTitle = maintenance?.assetTag ?? computer?.assetTag ?? 'Equipamento'
  const hostnameTitle = maintenance?.hostname ?? computer?.hostname ?? ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">
                Execução de Preventiva · {assetTitle}
              </DialogTitle>
              <DialogDescription>
                {hostnameTitle} — Realize o checklist de 21 itens, medições, fotos e assinatura.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium">
              <Timer className="size-4 text-primary animate-pulse" />
              <span className="tabular text-sm font-semibold">
                {formatDuration(Math.round(timerSeconds / 60))}
              </span>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="checklist" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="checklist" className="gap-2">
                  <Sparkles className="size-4" />
                  Checklist (21)
                </TabsTrigger>
                <TabsTrigger value="pecas" className="gap-2">
                  <Package className="size-4" />
                  Peças ({form.watch('parts')?.length ?? 0})
                </TabsTrigger>
                <TabsTrigger value="fotos" className="gap-2">
                  <Camera className="size-4" />
                  Fotos
                </TabsTrigger>
                <TabsTrigger value="fechamento" className="gap-2">
                  <FileSignature className="size-4" />
                  Fechamento
                </TabsTrigger>
              </TabsList>

              {/* Aba 1: Checklist Completo */}
              <TabsContent value="checklist" className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Marque cada verificação realizada na máquina.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllDone}
                  >
                    <CheckCircle2 className="mr-1 size-3.5" />
                    Marcar tudo como feito
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {CHECKLIST_GROUPS.map((group) => (
                    <ChecklistGroupCard
                      key={group}
                      group={group}
                      fields={getGroupFields(group)}
                      form={form}
                      disabled={false}
                    />
                  ))}
                </div>
              </TabsContent>

              {/* Aba 2: Peças Consumidas */}
              <TabsContent value="pecas" className="space-y-4 pt-4">
                <SectionCard
                  title="Peças e Insumos do Estoque"
                  icon={Package}
                  description="Peças utilizadas serão automaticamente baixadas do saldo de estoque."
                >
                  <FormField
                    control={form.control}
                    name="parts"
                    render={({ field }) => (
                      <ChecklistPartsPicker
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </SectionCard>
              </TabsContent>

              {/* Aba 3: Fotos Antes / Depois */}
              <TabsContent value="fotos" className="space-y-4 pt-4">
                <div className="grid gap-6 md:grid-cols-2">
                  <SectionCard
                    title="Fotos Antes da Manutenção"
                    icon={Camera}
                    description="Evidências do estado inicial (poeira, cabos, etc.)."
                  >
                    <FormField
                      control={form.control}
                      name="photosBefore"
                      render={({ field }) => (
                        <PhotoUploader
                          value={field.value}
                          onChange={field.onChange}
                          max={4}
                        />
                      )}
                    />
                  </SectionCard>

                  <SectionCard
                    title="Fotos Depois da Manutenção"
                    icon={Camera}
                    description="Evidências após limpeza e organização."
                  >
                    <FormField
                      control={form.control}
                      name="photosAfter"
                      render={({ field }) => (
                        <PhotoUploader
                          value={field.value}
                          onChange={field.onChange}
                          max={4}
                        />
                      )}
                    />
                  </SectionCard>
                </div>
              </TabsContent>

              {/* Aba 4: Fechamento & Assinatura */}
              <TabsContent value="fechamento" className="space-y-4 pt-4">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="durationMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tempo Gasto (minutos) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={1440}
                              {...field}
                              onChange={(event) => {
                                // A partir daqui o cronômetro para de sobrescrever.
                                durationTouchedRef.current = true
                                field.onChange(event)
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parecer Técnico / Observações</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Relato de serviços executados, recomendações para o usuário..."
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="signatureDataUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assinatura Digital do Técnico *</FormLabel>
                        <FormControl>
                          <SignaturePad
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <CheckCircle2 className="mr-2 size-4" />
                {isSubmitting ? 'Concluindo...' : 'Concluir Preventiva'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
