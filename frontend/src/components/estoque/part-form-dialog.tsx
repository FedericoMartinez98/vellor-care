'use client'

/**
 * Dialog de cadastro e edição de peça de estoque.
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
import { Textarea } from '@/components/ui/textarea'
import { PART_CATEGORY_LABELS } from '@/lib/constants'
import { partSchema, type PartInput } from '@/lib/schemas'
import { useVellor } from '@/lib/store'
import { PART_CATEGORY, type InventoryPart } from '@/lib/types'

export interface PartFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partToEdit?: InventoryPart
  onSuccess?: () => void
}

export function PartFormDialog({
  open,
  onOpenChange,
  partToEdit,
  onSuccess,
}: PartFormDialogProps) {
  const { createPart, updatePart } = useVellor()
  const isEditing = Boolean(partToEdit)

  const defaultValues: PartInput = React.useMemo(() => {
    if (partToEdit) {
      return {
        sku: partToEdit.sku,
        name: partToEdit.name,
        category: partToEdit.category,
        quantity: partToEdit.quantity,
        minimumQuantity: partToEdit.minimumQuantity,
        unit: partToEdit.unit,
        unitValue: partToEdit.unitValue,
        supplier: partToEdit.supplier ?? '',
        location: partToEdit.location ?? '',
        notes: partToEdit.notes ?? '',
      }
    }

    return {
      sku: '',
      name: '',
      category: 'SSD',
      quantity: 0,
      minimumQuantity: 2,
      unit: 'un',
      unitValue: 0,
      supplier: '',
      location: 'Armário TI',
      notes: '',
    }
  }, [partToEdit])

  const form = useForm<PartInput>({
    resolver: zodResolver(partSchema),
    defaultValues,
  })

  React.useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  function onSubmit(values: PartInput) {
    try {
      if (isEditing && partToEdit) {
        updatePart(partToEdit.id, values)
        toast.success(`Peça ${values.name} atualizada.`)
      } else {
        createPart(values)
        toast.success(`Peça ${values.name} cadastrada no estoque.`)
      }
      onSuccess?.()
      onOpenChange(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar a peça.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Editar Peça · ${partToEdit?.sku}` : 'Nova Peça no Catálogo'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados cadastrais, estoque mínimo ou valor unitário da peça.'
              : 'Cadastre um novo item no catálogo de peças e insumos da TI.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código SKU *</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: SSD-500-NVME" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PART_CATEGORY.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {PART_CATEGORY_LABELS[cat]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Peça *</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: SSD Kingston 500GB NVMe M.2" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Saldo Atual</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minimumQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque Mínimo</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
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
                    <FormLabel>Unidade</FormLabel>
                    <FormControl>
                      <Input placeholder="un, seringa, kit" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="unitValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Unitário (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localização / Armário</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: Armário TI - Gaveta A1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor Principal</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Kingston, Corsair, Kabum" {...field} />
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
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações de compatibilidade ou compra..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {isEditing ? 'Salvar Alterações' : 'Cadastrar Peça'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
