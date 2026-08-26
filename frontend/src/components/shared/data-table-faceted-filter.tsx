'use client'

import type { Column } from '@tanstack/react-table'
import { Check, PlusCircle, type LucideIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface DataTableFacetedFilterOption {
  label: string
  value: string
  icon?: LucideIcon
  /**
   * Classe de cor do ponto exibido antes do rótulo — sempre um token do tema
   * (ex.: 'bg-success', 'bg-warning', 'bg-chart-3'). Nunca uma cor literal.
   */
  dot?: string
}

interface DataTableFacetedFilterProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
  options: DataTableFacetedFilterOption[]
}

/** Lê o filtro da coluna garantindo o formato array de strings. */
function readSelectedValues(rawValue: unknown): Set<string> {
  if (!Array.isArray(rawValue)) return new Set<string>()
  return new Set(rawValue.filter((item): item is string => typeof item === 'string'))
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const facetCounts = column.getFacetedUniqueValues()
  const selectedValues = readSelectedValues(column.getFilterValue())
  const selectedOptions = options.filter((option) => selectedValues.has(option.value))

  function toggleValue(value: string) {
    const next = new Set(selectedValues)

    if (next.has(value)) {
      next.delete(value)
    } else {
      next.add(value)
    }

    const values = Array.from(next)
    column.setFilterValue(values.length > 0 ? values : undefined)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 border-dashed">
          <PlusCircle className="size-4" aria-hidden="true" />
          {title}

          {selectedValues.size > 0 ? (
            <>
              <Separator orientation="vertical" className="mx-1 h-4" />

              <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                {selectedValues.size}
              </Badge>

              <span className="hidden items-center gap-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                    {selectedValues.size} selecionados
                  </Badge>
                ) : (
                  selectedOptions.map((option) => (
                    <Badge
                      key={option.value}
                      variant="secondary"
                      className="rounded-sm px-1 font-normal"
                    >
                      {option.label}
                    </Badge>
                  ))
                )}
              </span>
            </>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>Nenhum resultado.</CommandEmpty>

            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value)
                const Icon = option.icon
                const count = facetCounts.get(option.value)

                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => toggleValue(option.value)}
                  >
                    <div
                      aria-hidden="true"
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-sm border border-primary transition-colors',
                        isSelected
                          ? 'bg-primary'
                          : 'opacity-50 [&_svg]:invisible',
                      )}
                    >
                      {/* O `!` vence a regra `[&_svg]` do CommandItem, que pintaria o check de cinza. */}
                      <Check className="size-3 text-primary-foreground!" />
                    </div>

                    {option.dot ? (
                      <span
                        aria-hidden="true"
                        className={cn('size-2 shrink-0 rounded-full', option.dot)}
                      />
                    ) : null}

                    {Icon ? <Icon className="size-4 shrink-0" aria-hidden="true" /> : null}

                    <span className="truncate">{option.label}</span>

                    {count !== undefined ? (
                      <span className="ml-auto text-xs text-muted-foreground tabular">{count}</span>
                    ) : null}
                  </CommandItem>
                )
              })}
            </CommandGroup>

            {selectedValues.size > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => column.setFilterValue(undefined)}
                    className="justify-center text-center"
                  >
                    Limpar filtros
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export type { DataTableFacetedFilterOption, DataTableFacetedFilterProps }
