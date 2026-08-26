'use client'

/**
 * Dialog de criação e edição de computador no inventário.
 * Formulário segmentado em Identificação, Responsável, Hardware, Sistema e Garantia.
 */

import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch, ApiError, endpoints, isRemoteBackend } from '@/lib/api'
import { type ApiComputer, mapApiComputer, toComputerWriteRequest } from '@/lib/api/mappers'
import {
  COMPUTER_STATUS_LABELS,
  STORAGE_TYPE_LABELS,
} from '@/lib/constants'
import { useRealInventory } from '@/lib/hooks/use-real-inventory'
import { computerSchema, type ComputerInput } from '@/lib/schemas'
import { useVellor } from '@/lib/store'
import { COMPUTER_STATUS, STORAGE_TYPE, type Computer } from '@/lib/types'

export interface ComputerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  computerToEdit?: Computer
  onSuccess?: (computer: Computer) => void
}

const DEFAULT_INTERVAL = 90

export function ComputerFormDialog({
  open,
  onOpenChange,
  computerToEdit,
  onSuccess,
}: ComputerFormDialogProps) {
  const mock = useVellor()
  const real = useRealInventory()
  const remote = isRemoteBackend()

  const { createComputer, updateComputer } = mock
  const sectors = remote ? real.sectors : mock.sectors
  const isEditing = Boolean(computerToEdit)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const defaultValues: ComputerInput = React.useMemo(() => {
    if (computerToEdit) {
      return {
        assetTag: computerToEdit.assetTag,
        hostname: computerToEdit.hostname,
        serialNumber: computerToEdit.serialNumber,
        model: computerToEdit.model,
        manufacturer: computerToEdit.manufacturer,
        status: computerToEdit.status,
        notes: computerToEdit.notes ?? '',
        photoUrl: computerToEdit.photoUrl ?? '',
        maintenanceIntervalDays: computerToEdit.maintenanceIntervalDays ?? DEFAULT_INTERVAL,
        assignment: {
          employeeName: computerToEdit.assignment.employeeName,
          employeeEmail: computerToEdit.assignment.employeeEmail,
          sectorId: computerToEdit.assignment.sectorId,
          unit: computerToEdit.assignment.unit,
          location: computerToEdit.assignment.location ?? '',
        },
        hardware: {
          processor: computerToEdit.hardware.processor,
          ramGb: computerToEdit.hardware.ramGb,
          ramDetail: computerToEdit.hardware.ramDetail ?? '',
          storageType: computerToEdit.hardware.storageType,
          storageGb: computerToEdit.hardware.storageGb,
          storageDetail: computerToEdit.hardware.storageDetail ?? '',
          gpu: computerToEdit.hardware.gpu ?? '',
          powerSupply: computerToEdit.hardware.powerSupply ?? '',
          motherboard: computerToEdit.hardware.motherboard ?? '',
          acquisitionDate: computerToEdit.hardware.acquisitionDate,
        },
        system: {
          windowsVersion: computerToEdit.system.windowsVersion,
          windowsBuild: computerToEdit.system.windowsBuild,
          officeVersion: computerToEdit.system.officeVersion ?? '',
          antivirus: computerToEdit.system.antivirus ?? '',
          lastWindowsUpdate: computerToEdit.system.lastWindowsUpdate ?? '',
          domainJoined: computerToEdit.system.domainJoined ?? false,
        },
        warranty: {
          supplier: computerToEdit.warranty?.supplier ?? '',
          invoiceNumber: computerToEdit.warranty?.invoiceNumber ?? '',
          warrantyUntil: computerToEdit.warranty?.warrantyUntil ?? '',
          purchaseValue: computerToEdit.warranty?.purchaseValue ?? 0,
        },
      }
    }

    return {
      assetTag: '',
      hostname: '',
      serialNumber: '',
      model: '',
      manufacturer: '',
      status: 'ATIVO',
      notes: '',
      photoUrl: '',
      maintenanceIntervalDays: DEFAULT_INTERVAL,
      assignment: {
        employeeName: '',
        employeeEmail: '',
        sectorId: sectors[0]?.id ?? '',
        unit: 'Matriz',
        location: '',
      },
      hardware: {
        processor: '',
        ramGb: 16,
        ramDetail: 'DDR4 3200MHz',
        storageType: 'SSD_NVME',
        storageGb: 512,
        storageDetail: '',
        gpu: '',
        powerSupply: '',
        motherboard: '',
        acquisitionDate: new Date().toISOString().slice(0, 10),
      },
      system: {
        windowsVersion: 'Windows 11 Pro',
        windowsBuild: '23H2 (22631)',
        officeVersion: 'Microsoft 365 Apps',
        antivirus: 'Microsoft Defender',
        lastWindowsUpdate: new Date().toISOString().slice(0, 10),
        domainJoined: true,
      },
      warranty: {
        supplier: '',
        invoiceNumber: '',
        warrantyUntil: '',
        purchaseValue: 0,
      },
    }
  }, [computerToEdit, sectors])

  const form = useForm<ComputerInput>({
    resolver: zodResolver(computerSchema),
    defaultValues,
  })

  React.useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  const selectedSectorId = form.watch('assignment.sectorId')

  // No backend real a unidade é derivada do setor (cada setor pertence a
  // exatamente uma unidade) -- não é um campo livre como no modo mock.
  React.useEffect(() => {
    if (!remote) return
    const sector = real.apiSectors.find((s) => s.id === selectedSectorId)
    if (sector) form.setValue('assignment.unit', sector.unitName)
  }, [remote, real.apiSectors, selectedSectorId, form])

  async function onSubmit(values: ComputerInput) {
    setIsSubmitting(true)
    try {
      if (remote) {
        const sector = real.apiSectors.find((s) => s.id === values.assignment.sectorId)
        if (!sector) {
          toast.error('Selecione um setor válido.')
          return
        }

        const body = toComputerWriteRequest(values, sector.unitId)
        const path =
          isEditing && computerToEdit
            ? endpoints.computers.update(computerToEdit.id)
            : endpoints.computers.create()

        const saved = await apiFetch<ApiComputer>(path, {
          method: isEditing && computerToEdit ? 'PUT' : 'POST',
          body: JSON.stringify(body),
        })

        toast.success(
          isEditing
            ? `Equipamento ${values.assetTag} atualizado com sucesso.`
            : `Equipamento ${values.assetTag} cadastrado com sucesso.`,
        )
        await real.refresh()
        onSuccess?.(mapApiComputer(saved))
      } else if (isEditing && computerToEdit) {
        updateComputer(computerToEdit.id, values)
        toast.success(`Equipamento ${values.assetTag} atualizado com sucesso.`)
        onSuccess?.({ ...computerToEdit, ...values } as Computer)
      } else {
        const created = createComputer(values)
        toast.success(`Equipamento ${values.assetTag} cadastrado com sucesso.`)
        onSuccess?.(created)
      }
      onOpenChange(false)
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : 'Ocorreu um erro ao salvar o equipamento.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Editar Equipamento · ${computerToEdit?.assetTag}` : 'Novo Equipamento'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados patrimoniais, hardware ou responsável.'
              : 'Cadastre um novo computador no inventário de ativos de TI.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="geral" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="geral">Identificação</TabsTrigger>
                <TabsTrigger value="responsavel">Responsável</TabsTrigger>
                <TabsTrigger value="hardware">Hardware</TabsTrigger>
                <TabsTrigger value="sistema">Sistema & Garantia</TabsTrigger>
              </TabsList>

              {/* Aba: Identificação Geral */}
              <TabsContent value="geral" className="space-y-4 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="assetTag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Patrimônio *</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: PAT-0142" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hostname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hostname *</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: ADM-NB-014" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="serialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de Série *</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: 5CG1234ABC" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COMPUTER_STATUS.map((status) => (
                              <SelectItem key={status} value={status}>
                                {COMPUTER_STATUS_LABELS[status]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="manufacturer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fabricante *</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: Dell, Lenovo, HP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modelo *</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: Latitude 3420" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maintenanceIntervalDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intervalo de Preventiva (dias) *</FormLabel>
                        <FormControl>
                          <Input type="number" min={15} max={365} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações Gerais</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observações internas sobre o ativo, histórico de danos, etc."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Aba: Responsável e Alocação */}
              <TabsContent value="responsavel" className="space-y-4 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="assignment.employeeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Colaborador *</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: Carlos Eduardo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assignment.employeeEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="carlos.eduardo@vellor.com.br" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assignment.sectorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setor *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o setor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sectors.map((sector) => (
                              <SelectItem key={sector.id} value={sector.id}>
                                {sector.name} ({sector.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assignment.unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidade *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="ex: Matriz, CD, Loja Centro"
                            readOnly={remote}
                            className={remote ? 'bg-muted' : undefined}
                            {...field}
                          />
                        </FormControl>
                        {remote ? (
                          <p className="text-xs text-muted-foreground">
                            Definida automaticamente pelo setor escolhido.
                          </p>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assignment.location"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Localização / Posição de Trabalho</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: 2º Andar - Sala 204 - Mesa 03" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Aba: Hardware */}
              <TabsContent value="hardware" className="space-y-4 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="hardware.processor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Processador *</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: Intel Core i5-12400" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hardware.ramGb"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Memória RAM (GB) *</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={1024} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hardware.ramDetail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Detalhes da RAM</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: 2x 8GB DDR4 3200MHz Kingston" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hardware.storageType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Armazenamento *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STORAGE_TYPE.map((type) => (
                              <SelectItem key={type} value={type}>
                                {STORAGE_TYPE_LABELS[type]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hardware.storageGb"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacidade de Armazenamento (GB) *</FormLabel>
                        <FormControl>
                          <Input type="number" min={64} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hardware.storageDetail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Detalhes do Armazenamento</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: Kingston NV2 M.2 2280" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hardware.gpu"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Placa de Vídeo</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: Integrada / NVIDIA GTX 1650" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hardware.acquisitionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Aquisição *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Aba: Sistema & Garantia */}
              <TabsContent value="sistema" className="space-y-4 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="system.windowsVersion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Versão do Windows *</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: Windows 11 Pro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="system.windowsBuild"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Build *</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: 22631.3007" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="system.officeVersion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Versão do Office</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: Microsoft 365 Apps" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="system.antivirus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Antivírus</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: Microsoft Defender" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="warranty.supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fornecedor</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: Dell Computadores" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="warranty.invoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nota Fiscal</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: NF-e 001.452.889" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="warranty.warrantyUntil"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Garantia até</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="warranty.purchaseValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor de Compra (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min={0} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="system.domainJoined"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm sm:col-span-2">
                        <div className="space-y-0.5">
                          <FormLabel>Ingressado no Domínio Active Directory</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Marque se o computador está autenticado no domínio corporativo.
                          </p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Salvando...'
                  : isEditing
                    ? 'Salvar Alterações'
                    : 'Cadastrar Equipamento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
