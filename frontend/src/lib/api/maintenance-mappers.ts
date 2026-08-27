/**
 * Vellor Care — Conversores entre o JSON de manutenção do backend Spring e os
 * tipos de tela (`@/lib/types`).
 *
 * Os shapes divergem em pontos que quebram silenciosamente se não forem
 * traduzidos:
 *  - checklist: backend usa `itemKey`/`measuredValue`, a tela usa `key`/`value`;
 *  - `spring.jackson.default-property-inclusion: non_null` faz o backend
 *    OMITIR chaves nulas — nunca vêm como `null`, simplesmente não vêm. Por
 *    isso todo campo opcional é normalizado aqui;
 *  - `checklist`/`parts`/`photos` são desreferenciados sem guarda pelas telas
 *    (ex: `maintenance.photos.filter(...)` no diálogo de detalhes), então
 *    precisam sempre virar array, nunca `undefined`.
 */

import type {
  ChecklistGroup,
  Maintenance,
  MaintenanceChecklistItem,
  MaintenancePartUsage,
  MaintenancePhoto,
  MaintenanceStatus,
  MaintenanceType,
  Priority,
} from '@/lib/types'

/** Item de checklist como o backend devolve (`MaintenanceChecklistItem` em Java). */
export interface ApiChecklistItem {
  id?: string
  itemKey: string
  label: string
  group: ChecklistGroup
  done: boolean
  measuredValue?: number | null
  note?: string | null
  sortOrder?: number
}

export interface ApiPartUsage {
  id?: string
  partId: string
  partName?: string | null
  quantity: number
  unitCost?: number | null
}

export interface ApiPhoto {
  id?: string
  url: string
  caption?: string | null
  moment: 'ANTES' | 'DEPOIS'
  createdAt?: string
}

/** `Maintenance` como o backend devolve (record serializado direto, sem DTO). */
export interface ApiMaintenance {
  id: string
  computerId: string
  assetTag?: string | null
  hostname?: string | null
  sectorId?: string | null
  technicianId?: string | null
  technicianName?: string | null
  type: MaintenanceType
  status: MaintenanceStatus
  priority: Priority
  scheduledFor: string
  startedAt?: string | null
  finishedAt?: string | null
  durationMinutes?: number | null
  checklist?: ApiChecklistItem[] | null
  parts?: ApiPartUsage[] | null
  photos?: ApiPhoto[] | null
  notes?: string | null
  signatureDataUrl?: string | null
  createdAt: string
  updatedAt: string
}

function orUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value
}

export function mapApiMaintenance(api: ApiMaintenance): Maintenance {
  const checklist: MaintenanceChecklistItem[] = (api.checklist ?? [])
    // O backend não garante ordem (não há @OrderBy na coleção), então ordena aqui.
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((item) => ({
      key: item.itemKey,
      label: item.label,
      group: item.group,
      done: item.done,
      value: orUndefined(item.measuredValue),
      note: orUndefined(item.note),
    }))

  const parts: MaintenancePartUsage[] = (api.parts ?? []).map((part) => ({
    partId: part.partId,
    partName: part.partName ?? '',
    quantity: part.quantity,
    unitCost: orUndefined(part.unitCost),
  }))

  const photos: MaintenancePhoto[] = (api.photos ?? []).map((photo, index) => ({
    id: photo.id ?? `${api.id}-foto-${index}`,
    url: photo.url,
    caption: orUndefined(photo.caption),
    moment: photo.moment,
  }))

  return {
    id: api.id,
    computerId: api.computerId,
    assetTag: api.assetTag ?? '',
    hostname: api.hostname ?? '',
    sectorId: api.sectorId ?? '',
    technicianId: api.technicianId ?? '',
    technicianName: api.technicianName ?? '',
    type: api.type,
    status: api.status,
    priority: api.priority,
    scheduledFor: api.scheduledFor,
    startedAt: orUndefined(api.startedAt),
    finishedAt: orUndefined(api.finishedAt),
    durationMinutes: orUndefined(api.durationMinutes),
    checklist,
    parts,
    photos,
    notes: orUndefined(api.notes),
    signatureDataUrl: orUndefined(api.signatureDataUrl),
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  }
}

/** Corpo de `POST /maintenances` (`MaintenanceCreateRequest`). */
export interface MaintenanceCreateBody {
  computerId: string
  technicianId: string
  type?: MaintenanceType
  priority?: Priority
  scheduledFor?: string
  notes?: string
}

/** Corpo de `POST /maintenances/{id}/complete` (`CompleteMaintenanceRequest`). */
export interface MaintenanceCompleteBody {
  checklist: ApiChecklistItem[]
  parts: Array<{ partId: string; quantity: number }>
  photosBefore: string[]
  photosAfter: string[]
  durationMinutes: number
  notes?: string
  signatureDataUrl: string
}

export interface CompleteMaintenanceFormValues {
  checklist: MaintenanceChecklistItem[]
  parts: Array<{ partId: string; quantity: number }>
  photosBefore: string[]
  photosAfter: string[]
  durationMinutes: number
  notes?: string
  signatureDataUrl: string
}

export function toMaintenanceCompleteBody(
  values: CompleteMaintenanceFormValues,
): MaintenanceCompleteBody {
  return {
    checklist: values.checklist.map((item, index) => ({
      itemKey: item.key,
      label: item.label,
      group: item.group,
      done: item.done,
      // `measuredValue`/`note` viram null explícito quando vazios: o backend
      // aceita null, e mandar `undefined` sumiria a chave (o que dá no mesmo,
      // mas null deixa a intenção explícita no payload).
      measuredValue: item.value ?? null,
      note: item.note && item.note.trim().length > 0 ? item.note : null,
      sortOrder: index,
    })),
    parts: values.parts,
    photosBefore: values.photosBefore,
    photosAfter: values.photosAfter,
    durationMinutes: values.durationMinutes,
    notes: values.notes && values.notes.trim().length > 0 ? values.notes : undefined,
    signatureDataUrl: values.signatureDataUrl,
  }
}
