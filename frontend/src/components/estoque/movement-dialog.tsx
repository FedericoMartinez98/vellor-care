'use client'

/**
 * Dialog de registro manual de movimentação de estoque:
 * Entradas (compra), Saídas avulsas, Ajustes de balanço e Descartes.
 */

import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowRightLeft } from 'lucide-react'
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
import { MOVEMENT_TYPE_LABELS } from '@/lib/constants'
import { movementSchema, type MovementInput } from '@/lib/schemas'
import { useVellor } from '@/lib/store'
import { MOVEMENT_TYPE, type InventoryPart } from '@/lib/types'

export interface MovementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPart?: InventoryPart
  onSuccess?: () => void
}

export function MovementDialog({
  open,
  onOpenChange,
  initialPart,
  onSuccess,
}: MovementDialogProps) {
  const { parts, movePart } = useVellor()

  const form = useForm<MovementInput>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      partId: initialPart?.id ?? parts[0]?.id ?? '',
      type: 'ENTRADA',
      quantity: 1,
      reason: '',
    },
  })

  React.useEffect(() => {
    if (open) {
      form.reset({
        partId: initialPart?.id ?? parts[0]?.id ?? '',
        type: 'ENTRADA',
        quantity: 1,
        reason: '',
      })
    }
  }, [open, initialPart, parts, form])

  function onSubmit(values: MovementInput) {
    try {
      movePart(values)
      toast.success('Movimentação de estoque registrada com sucesso.')
      onSuccess?.()
      onOpenChange(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar movimentação.')
    }
  }

  const selectedPartId = form.watch('partId')
  const currentPart = parts.find((p) => p.id === selectedPartId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Movimentar Estoque</DialogTitle>
          <DialogDescription>
            Registre entrada de novas peças, ajustes de inventário ou descartes de material.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="partId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peça / Insumo *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a peça" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {parts.map((part) => (
                        <SelectItem key={part.id} value={part.id}>
                          {part.name} (Saldo: {part.quantity} {part.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Movimentação *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MOVEMENT_TYPE.map((type) => (
                          <SelectItem key={type} value={type}>
                            {MOVEMENT_TYPE_LABELS[type]}
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
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade ({currentPart?.unit ?? 'un'}) *</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo / Nota Fiscal / Observação</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex.: Compra NF-e 4521, queima de componente em teste..."
                      rows={3}
                      {...field}
                    />
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
                <ArrowRightLeft className="mr-2 size-4" />
                Confirmar Movimentação
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
