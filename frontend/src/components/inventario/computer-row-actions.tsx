'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Eye, MoreHorizontal, Pencil, QrCode, Trash2, Wrench } from 'lucide-react'

import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Computer } from '@/lib/types'

export interface ComputerRowActionsProps {
  computer: Computer
  onEdit: (computer: Computer) => void
  onDelete: (computer: Computer) => void
  onNewMaintenance: (computer: Computer) => void
}

/**
 * Menu de ações da linha do inventário.
 *
 * A linha da tabela navega no clique (`onRowClick`), por isso o gatilho do menu
 * interrompe a propagação: sem isso, abrir o menu levaria junto para a ficha.
 */
export function ComputerRowActions({
  computer,
  onEdit,
  onDelete,
  onNewMaintenance,
}: ComputerRowActionsProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Ações — ${computer.assetTag}`}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => router.push(`/inventario/${computer.id}`)}>
            <Eye aria-hidden="true" />
            Ver ficha
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => onEdit(computer)}>
            <Pencil aria-hidden="true" />
            Editar
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => onNewMaintenance(computer)}>
            <Wrench aria-hidden="true" />
            Iniciar manutenção
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => router.push(`/inventario/${computer.id}?aba=etiqueta`)}
          >
            <QrCode aria-hidden="true" />
            Etiqueta / QR Code
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <Trash2 aria-hidden="true" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Excluir o computador ${computer.assetTag}?`}
        description={`Além do equipamento, todo o histórico de manutenções de ${computer.hostname} e os alertas vinculados a ele serão removidos. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir definitivamente"
        destructive
        onConfirm={() => onDelete(computer)}
      />
    </>
  )
}
