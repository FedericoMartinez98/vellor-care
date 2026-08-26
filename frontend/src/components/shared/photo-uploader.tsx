'use client'

import * as React from 'react'
import { ImagePlus, X } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

export interface PhotoUploaderProps {
  value: string[]
  onChange: (v: string[]) => void
  label?: string
  max?: number
  maxSizeMb?: number
  disabled?: boolean
}

/** Lê um arquivo de imagem como data-URL (o app não tem upload de binário hoje). */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') resolve(result)
      else reject(new Error('Conteúdo inválido.'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Falha na leitura.'))
    reader.readAsDataURL(file)
  })
}

function PhotoUploader({
  value,
  onChange,
  label,
  max = 6,
  maxSizeMb = 4,
  disabled = false,
}: PhotoUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  const maxBytes = maxSizeMb * 1024 * 1024
  const isFull = value.length >= max
  const isBlocked = disabled || isFull

  async function addFiles(fileList: FileList | null) {
    if (disabled) return

    const incoming = Array.from(fileList ?? [])
    if (incoming.length === 0) return

    const remaining = max - value.length
    if (remaining <= 0) {
      toast.error(`Limite de ${max} fotos atingido.`)
      return
    }

    const valid: File[] = []
    for (const file of incoming) {
      if (!file.type.startsWith('image/')) {
        toast.error(`"${file.name}" não é uma imagem. Envie PNG ou JPG.`)
        continue
      }
      if (file.size > maxBytes) {
        toast.error(`"${file.name}" passa de ${maxSizeMb} MB.`)
        continue
      }
      valid.push(file)
    }

    if (valid.length === 0) return

    const accepted = valid.slice(0, remaining)
    if (accepted.length < valid.length) {
      toast.error(`Só cabem mais ${remaining} foto(s): o limite é de ${max}.`)
    }

    try {
      const dataUrls = await Promise.all(accepted.map(readAsDataUrl))
      onChange([...value, ...dataUrls])
    } catch {
      toast.error('Não foi possível ler as imagens selecionadas.')
    }
  }

  function openPicker() {
    if (isBlocked) {
      if (isFull) toast.error(`Limite de ${max} fotos atingido.`)
      return
    }
    inputRef.current?.click()
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    openPicker()
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (isBlocked) return
    setIsDragging(true)
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    if (isBlocked) return
    void addFiles(event.dataTransfer.files)
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    void addFiles(event.target.files)
    // Zera para permitir selecionar o mesmo arquivo outra vez.
    event.target.value = ''
  }

  function removeAt(index: number) {
    onChange(value.filter((_, position) => position !== index))
  }

  return (
    <div className="flex flex-col gap-3">
      {label ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{label}</p>
          <span className="text-xs text-muted-foreground tabular">
            {value.length} de {max}
          </span>
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        disabled={disabled}
        onChange={handleInputChange}
      />

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={isBlocked}
        aria-label="Adicionar fotos"
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'focus-ring flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors',
          isBlocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-primary/50',
          isDragging && !isBlocked && 'border-primary/50 bg-primary-soft/40',
        )}
      >
        <ImagePlus aria-hidden="true" className="size-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">Arraste as fotos ou clique para selecionar</p>
        <p className="mt-1 text-xs text-muted-foreground">
          PNG ou JPG, até {maxSizeMb} MB — máximo de {max} fotos
        </p>
      </div>

      {value.length > 0 ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {value.map((photo, index) => (
            <li
              key={`${index}-${photo.slice(-24)}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border"
            >
              {/* São data-URLs em memória: next/image não se aplica aqui. */}
              <img
                src={photo}
                alt={`Foto ${index + 1} de ${value.length}`}
                className="size-full object-cover"
              />

              {!disabled ? (
                <button
                  type="button"
                  aria-label="Remover foto"
                  onClick={() => removeAt(index)}
                  className="focus-ring absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-foreground/70 text-background opacity-100 transition-opacity hover:bg-foreground sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export { PhotoUploader }
