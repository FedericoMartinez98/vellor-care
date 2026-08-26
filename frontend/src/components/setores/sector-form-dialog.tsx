'use client'

/**
 * Dialog de criação e edição de setor corporativo.
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
import { CHART_COLORS } from '@/lib/constants'
import { sectorSchema, type SectorInput } from '@/lib/schemas'
import { useVellor } from '@/lib/store'
import type { Sector } from '@/lib/types'

export interface SectorFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sectorToEdit?: Sector
  onSuccess?: () => void
}

export function SectorFormDialog({
  open,
  onOpenChange,
  sectorToEdit,
  onSuccess,
}: SectorFormDialogProps) {
  const { createSector, updateSector, units } = useVellor()
  const isEditing = Boolean(sectorToEdit)

  const defaultValues: SectorInput = React.useMemo(() => {
    if (sectorToEdit) {
      return {
        name: sectorToEdit.name,
        code: sectorToEdit.code,
        unit: sectorToEdit.unit,
        manager: sectorToEdit.manager ?? '',
        costCenter: sectorToEdit.costCenter ?? '',
        color: sectorToEdit.color,
      }
    }

    return {
      name: '',
      code: '',
      unit: units[0]?.name ?? 'Matriz',
      manager: '',
      costCenter: '',
      color: 'var(--chart-1)',
    }
  }, [sectorToEdit, units])

  const form = useForm<SectorInput>({
    resolver: zodResolver(sectorSchema),
    defaultValues,
  })

  React.useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  function onSubmit(values: SectorInput) {
    try {
      if (isEditing && sectorToEdit) {
        updateSector(sectorToEdit.id, values)
        toast.success(`Setor ${values.name} atualizado com sucesso.`)
      } else {
        createSector(values)
        toast.success(`Setor ${values.name} criado com sucesso.`)
      }
      onSuccess?.()
      onOpenChange(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar o setor.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Editar Setor · ${sectorToEdit?.name}` : 'Novo Setor'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize a identificação, centro de custo ou responsável pelo setor.'
              : 'Cadastre um novo setor para agrupar computadores e colaboradores.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Setor *</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Recursos Humanos, Financeiro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código / Sigla *</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: RH, FIN, EXP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Unidade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={u.name}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="manager"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gestor do Setor</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: Mariana Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="costCenter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Centro de Custo</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: 1020, 2010" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor do Marcador</FormLabel>
                  <div className="flex items-center gap-2 pt-1">
                    {CHART_COLORS.map((color) => (
                      <button
                        type="button"
                        key={color}
                        onClick={() => field.onChange(color)}
                        className={`size-7 rounded-full border-2 transition-all ${
                          field.value === color ? 'border-foreground scale-110' : 'border-transparent opacity-80'
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Selecionar cor ${color}`}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {isEditing ? 'Salvar Alterações' : 'Criar Setor'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
