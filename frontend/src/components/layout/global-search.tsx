'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  FileText,
  MonitorSmartphone,
  Package,
  Search,
  UserRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
import { buildGlobalSearch, useVellor } from '@/lib/store'
import type { GlobalSearchResult } from '@/lib/types'
import { cn } from '@/lib/utils'

type SearchKind = GlobalSearchResult['kind']

const KIND_ORDER: SearchKind[] = [
  'COMPUTADOR',
  'MANUTENCAO',
  'PECA',
  'SETOR',
  'USUARIO',
  'PAGINA',
]

const KIND_LABELS: Record<SearchKind, string> = {
  COMPUTADOR: 'Computadores',
  MANUTENCAO: 'Manutenções',
  PECA: 'Peças',
  SETOR: 'Setores',
  USUARIO: 'Usuários',
  PAGINA: 'Páginas',
}

const KIND_ICONS: Record<SearchKind, LucideIcon> = {
  COMPUTADOR: MonitorSmartphone,
  MANUTENCAO: Wrench,
  PECA: Package,
  SETOR: Building2,
  USUARIO: UserRound,
  PAGINA: FileText,
}

const DEBOUNCE_MS = 120

export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter()
  const { db } = useVellor()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((previous) => !previous)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next)
    if (!next) {
      setQuery('')
      setDebouncedQuery('')
    }
  }, [])

  const term = debouncedQuery.trim()

  const groups = useMemo(() => {
    if (term.length === 0) return []
    const results = buildGlobalSearch(db, term)

    return KIND_ORDER.map((kind) => ({
      kind,
      items: results.filter((result) => result.kind === kind),
    })).filter((group) => group.items.length > 0)
  }, [db, term])

  const handleSelect = useCallback(
    (href: string) => {
      handleOpenChange(false)
      router.push(href)
    },
    [handleOpenChange, router],
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir busca global"
        aria-keyshortcuts="Control+K"
        className={cn(
          'focus-ring flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
          className,
        )}
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">Buscar computador, patrimônio, técnico...</span>
        <span aria-hidden="true" className="ml-auto hidden shrink-0 items-center gap-1 sm:flex">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Busca global"
        description="Busque computadores, manutenções, peças, setores, usuários e páginas"
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Buscar computador, patrimônio, técnico..."
        />

        <CommandList>
          {term.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Digite para buscar computadores, manutenções, peças, setores e usuários.
            </p>
          ) : (
            <>
              <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

              {groups.map((group) => {
                const Icon = KIND_ICONS[group.kind]

                return (
                  <CommandGroup key={group.kind} heading={KIND_LABELS[group.kind]}>
                    {group.items.map((result) => (
                      <CommandItem
                        key={`${result.kind}-${result.id}`}
                        value={`${result.kind}-${result.id}`}
                        // A filtragem já é feita por buildGlobalSearch (com acentos normalizados);
                        // repetir o termo aqui impede o cmdk de descartar resultados válidos.
                        keywords={[result.title, result.subtitle ?? '', query, term]}
                        onSelect={() => handleSelect(result.href)}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">{result.title}</span>
                          {result.subtitle ? (
                            <span className="truncate text-xs text-muted-foreground">
                              {result.subtitle}
                            </span>
                          ) : null}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
              })}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
