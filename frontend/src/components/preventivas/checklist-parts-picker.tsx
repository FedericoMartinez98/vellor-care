'use client'

/**
 * Vellor Care — Seletor de peças consumidas na preventiva.
 *
 * A baixa no estoque é feita pelo store ao concluir a manutenção; aqui apenas
 * montamos a lista de consumo, respeitando o saldo disponível e avisando quando
 * a peça vai furar o estoque mínimo depois da baixa.
 */

import * as React from 'react'
import { AlertTriangle, Check, Minus, Package, PackageSearch, Plus, X } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { EmptyState } from '@/components/ui/empty-state'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PART_CATEGORY_LABELS } from '@/lib/constants'
import { isRemoteBackend } from '@/lib/api'
import { formatCurrency, formatNumber } from '@/lib/format'
import { useRealParts } from '@/lib/hooks/use-real-parts'
import type { ChecklistPartUsageInput } from '@/lib/schemas'
import { useVellor } from '@/lib/store'
import type { InventoryPart } from '@/lib/types'

export interface ChecklistPartsPickerProps {
  value: ChecklistPartUsageInput[]
  onChange: (value: ChecklistPartUsageInput[]) => void
  disabled?: boolean
}

/** Linha da lista já cruzada com o cadastro da peça. */
interface UsageRow {
  partId: string
  quantity: number
  part?: InventoryPart
  name: string
  unit: string
  available: number
  cost: number
  /** Saldo que sobra depois da baixa. */
  balanceAfter: number
  belowMinimum: boolean
  shortage: boolean
}

function ChecklistPartsPicker({ value, onChange, disabled = false }: ChecklistPartsPickerProps) {
  const vellor = useVellor()
  const realParts = useRealParts()
  const remote = isRemoteBackend()
  const [open, setOpen] = React.useState(false)

  // No modo remoto o catálogo tem que vir do backend: o id da peça viaja no
  // payload de conclusão e o backend rejeita a manutenção inteira se ele não
  // existir no estoque real.
  const sourceParts = remote ? realParts.parts : vellor.parts

  const catalog = React.useMemo(
    () => [...sourceParts].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [sourceParts],
  )

  const getPart = React.useCallback(
    (partId: string): InventoryPart | undefined =>
      remote ? realParts.parts.find((part) => part.id === partId) : vellor.getPart(partId),
    [remote, realParts.parts, vellor],
  )

  const rows = React.useMemo<UsageRow[]>(
    () =>
      value.map((usage) => {
        const part = getPart(usage.partId)
        const available = part?.quantity ?? 0
        const balanceAfter = Math.max(0, available - usage.quantity)

        return {
          partId: usage.partId,
          quantity: usage.quantity,
          part,
          name: part?.name ?? 'Peça removida do estoque',
          unit: part?.unit ?? 'un',
          available,
          cost: usage.quantity * (part?.unitValue ?? 0),
          balanceAfter,
          belowMinimum: part ? balanceAfter <= part.minimumQuantity : false,
          shortage: usage.quantity > available,
        }
      }),
    [value, getPart],
  )

  const total = rows.reduce((sum, row) => sum + row.cost, 0)
  const warnings = rows.filter((row) => row.belowMinimum || row.shortage)

  function addPart(part: InventoryPart) {
    setOpen(false)
    if (disabled) return
    if (value.some((usage) => usage.partId === part.id)) return
    onChange([...value, { partId: part.id, quantity: 1 }])
  }

  function changeQuantity(partId: string, delta: number) {
    if (disabled) return
    onChange(
      value.map((usage) => {
        if (usage.partId !== partId) return usage
        const available = getPart(partId)?.quantity ?? usage.quantity
        const next = Math.min(Math.max(1, usage.quantity + delta), Math.max(1, available))
        return { ...usage, quantity: next }
      }),
    )
  }

  function removePart(partId: string) {
    if (disabled) return
    onChange(value.filter((usage) => usage.partId !== partId))
  }

  return (
    <div className="flex flex-col gap-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-expanded={open}
            className="w-full justify-start sm:w-auto"
          >
            <PackageSearch className="size-4" />
            Adicionar peça do estoque
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-[min(24rem,calc(100vw-2rem))] p-0"
          onOpenAutoFocus={(event) => {
            // Deixa o cmdk assumir o foco do campo de busca sem pular a lista.
            event.preventDefault()
          }}
        >
          <Command>
            <CommandInput placeholder="Buscar por nome ou SKU..." />

            <CommandList>
              <CommandEmpty>Nenhuma peça encontrada no estoque.</CommandEmpty>

              <CommandGroup heading="Estoque de peças">
                {catalog.map((part) => {
                  const outOfStock = part.quantity === 0
                  const selected = value.some((usage) => usage.partId === part.id)

                  return (
                    <CommandItem
                      key={part.id}
                      value={`${part.name} ${part.sku}`}
                      disabled={outOfStock}
                      onSelect={() => addPart(part)}
                      className="gap-3"
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium">{part.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {part.sku} · {PART_CATEGORY_LABELS[part.category]}
                        </span>
                      </div>

                      {outOfStock ? (
                        <Badge variant="danger">Sem estoque</Badge>
                      ) : (
                        <span className="shrink-0 text-xs text-muted-foreground tabular">
                          {formatNumber(part.quantity)} {part.unit}
                        </span>
                      )}

                      {selected ? (
                        <Check aria-label="Já adicionada" className="size-4 text-success" />
                      ) : null}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {rows.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhuma peça utilizada"
          description="Se você trocou pasta térmica, memória ou qualquer item do estoque, registre aqui para a baixa automática."
          className="rounded-xl border border-dashed border-border py-10"
        />
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
            {rows.map((row) => (
              <li
                key={row.partId}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:flex-nowrap"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular">
                    {row.part
                      ? `${row.part.sku} · saldo ${formatNumber(row.available)} ${row.unit} · ${formatCurrency(row.part.unitValue)}/${row.unit}`
                      : 'Peça não encontrada no cadastro atual'}
                  </p>
                </div>

                <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Diminuir quantidade de ${row.name}`}
                    disabled={disabled || row.quantity <= 1}
                    onClick={() => changeQuantity(row.partId, -1)}
                  >
                    <Minus className="size-3.5" />
                  </Button>

                  <span className="w-8 text-center text-sm font-medium tabular">
                    {row.quantity}
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Aumentar quantidade de ${row.name}`}
                    disabled={disabled || row.quantity >= row.available}
                    onClick={() => changeQuantity(row.partId, 1)}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>

                <span className="w-24 shrink-0 text-right text-sm font-medium tabular">
                  {formatCurrency(row.cost)}
                </span>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remover ${row.name} da lista`}
                  disabled={disabled}
                  onClick={() => removePart(row.partId)}
                  className="text-muted-foreground"
                >
                  <X className="size-4" />
                </Button>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {rows.length === 1 ? '1 peça' : `${rows.length} peças`}
            </span>
            <span className="text-sm font-semibold tabular">{formatCurrency(total)}</span>
          </div>
        </>
      )}

      {warnings.length > 0 ? (
        <Alert variant="warning">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Atenção ao estoque</AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc">
              {warnings.map((row) => (
                <li key={row.partId}>
                  {row.shortage
                    ? `${row.name}: saldo insuficiente — há apenas ${formatNumber(row.available)} ${row.unit} disponíveis.`
                    : `${row.name} ficará com ${formatNumber(row.balanceAfter)} ${row.unit} após a baixa (mínimo: ${formatNumber(row.part?.minimumQuantity ?? 0)} ${row.unit}).`}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}

export { ChecklistPartsPicker }
