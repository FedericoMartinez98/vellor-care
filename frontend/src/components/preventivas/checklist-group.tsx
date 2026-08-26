'use client'

/**
 * Vellor Care — Cartão de um grupo do checklist da preventiva.
 *
 * Cada linha é clicável por inteiro (o `<label>` envolve o Checkbox), tem um
 * botão discreto de observação e, nos itens de medição, um campo numérico com
 * a unidade e a crítica de faixa — é essa crítica que vira informação de gestão.
 */

import type { UseFormReturn } from 'react-hook-form'
import {
  Gauge,
  Keyboard,
  MessageSquarePlus,
  RefreshCw,
  Sparkles,
  Thermometer,
  Wifi,
  type LucideIcon,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { CHECKLIST_GROUP_LABELS } from '@/lib/constants'
import type { ChecklistFormInput } from '@/lib/schemas'
import type { ChecklistGroup, ChecklistItemDefinition } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Faixa de tolerância de um item de medição. */
export type ChecklistMeasurement = NonNullable<ChecklistItemDefinition['measurement']>

/** Item do checklist já resolvido pelo runner: índice no formulário + estado atual. */
export interface ChecklistFieldEntry {
  /** `id` estável do `useFieldArray` (chave de renderização). */
  id: string
  /** Posição do item dentro de `items` no formulário. */
  index: number
  /** Chave de negócio do item (ex.: `temperatura_cpu`). */
  itemKey: string
  label: string
  done: boolean
  hasNote: boolean
  measurement?: ChecklistMeasurement
  /** Crítica de faixa quando o valor medido sai do limite aceitável. */
  violation?: string
}

export interface ChecklistGroupCardProps {
  group: ChecklistGroup
  fields: ChecklistFieldEntry[]
  form: UseFormReturn<ChecklistFormInput>
  disabled: boolean
}

const GROUP_ICONS: Record<ChecklistGroup, LucideIcon> = {
  LIMPEZA: Sparkles,
  TERMICA: Thermometer,
  PERIFERICOS: Keyboard,
  TESTES: Wifi,
  SOFTWARE: RefreshCw,
  MEDICOES: Gauge,
}

function ChecklistGroupCard({ group, fields, form, disabled }: ChecklistGroupCardProps) {
  if (fields.length === 0) return null

  const Icon = GROUP_ICONS[group]
  const doneCount = fields.filter((entry) => entry.done).length
  const complete = doneCount === fields.length

  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors',
            complete ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground',
          )}
        >
          <Icon className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold tracking-tight">
            {CHECKLIST_GROUP_LABELS[group]}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {fields.length === 1 ? '1 item' : `${fields.length} itens`}
          </p>
        </div>

        <Badge variant={complete ? 'success' : 'muted'} className="tabular">
          {doneCount}/{fields.length}
        </Badge>
      </CardHeader>

      <CardContent className="px-3 pb-1">
        <ul className="flex flex-col gap-0.5">
          {fields.map((entry) => (
            <li
              key={entry.id}
              className={cn(
                'rounded-lg transition-colors',
                entry.done ? 'bg-success-soft/40' : 'hover:bg-muted/50',
              )}
            >
              <div className="flex items-center gap-2 pr-2">
                <FormField
                  control={form.control}
                  name={`items.${entry.index}.done`}
                  render={({ field }) => (
                    <label
                      className={cn(
                        'flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3',
                        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                      )}
                    >
                      <FormControl>
                        <Checkbox
                          ref={field.ref}
                          name={field.name}
                          checked={field.value}
                          onBlur={field.onBlur}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                          disabled={disabled}
                        />
                      </FormControl>

                      <span
                        className={cn(
                          'min-w-0 text-sm leading-snug',
                          entry.done ? 'text-muted-foreground' : 'text-foreground',
                        )}
                      >
                        {entry.label}
                      </span>
                    </label>
                  )}
                />

                {entry.measurement ? (
                  <FormField
                    control={form.control}
                    name={`items.${entry.index}.value`}
                    render={({ field, fieldState }) => (
                      <FormItem className="w-28 shrink-0 gap-1 py-2">
                        <div className="relative">
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              inputMode="decimal"
                              disabled={disabled}
                              aria-label={`Valor medido — ${entry.label}`}
                              aria-invalid={fieldState.invalid || Boolean(entry.violation)}
                              className="pr-10 text-right tabular"
                              ref={field.ref}
                              name={field.name}
                              onBlur={field.onBlur}
                              value={field.value ?? ''}
                              onChange={(event) => {
                                const raw = event.target.value
                                field.onChange(raw === '' ? undefined : Number(raw))
                              }}
                            />
                          </FormControl>

                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground"
                          >
                            {entry.measurement?.unit}
                          </span>
                        </div>

                        <FormMessage className="leading-snug" />
                      </FormItem>
                    )}
                  />
                ) : null}

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Observação do item ${entry.label}`}
                      className={cn(
                        'shrink-0',
                        entry.hasNote ? 'text-primary' : 'text-muted-foreground',
                      )}
                    >
                      <MessageSquarePlus className="size-4" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent align="end" className="w-[min(20rem,calc(100vw-2rem))]">
                    <FormField
                      control={form.control}
                      name={`items.${entry.index}.note`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Observação · {entry.label}</FormLabel>

                          <FormControl>
                            <Textarea
                              rows={3}
                              disabled={disabled}
                              placeholder="Ex.: cooler com ruído, recomendada a troca na próxima visita."
                              className="min-h-24 text-sm"
                              ref={field.ref}
                              name={field.name}
                              onBlur={field.onBlur}
                              value={field.value ?? ''}
                              onChange={field.onChange}
                            />
                          </FormControl>

                          <FormDescription>
                            A observação entra no histórico e no relatório da preventiva.
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {entry.violation ? (
                <p className="px-3 pb-2 pl-10 text-xs font-medium text-danger">{entry.violation}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export { ChecklistGroupCard }
