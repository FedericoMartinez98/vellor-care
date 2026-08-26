/**
 * Vellor Care — Conversores entre o JSON do backend Spring e os tipos
 * usados pelas telas (`@/lib/types`).
 *
 * O app nasceu como protótipo 100% front-end (ver `@/lib/api/index.ts`) e o
 * shape dos tipos de tela nunca foi alinhado 1:1 com o contrato REST — por
 * exemplo `ComputerAssignment.unit` é o *nome* da unidade (resolvido aqui a
 * partir do setor), enquanto o backend só manda `unitId`. Este módulo é a
 * fronteira onde essa tradução acontece; o restante da tela não precisa
 * saber que o shape diverge.
 */

import type { ComputerInput } from '@/lib/schemas'
import type { Computer, Sector } from '@/lib/types'

/** Shape mínimo que este módulo espera de `GET/POST /sectors`. */
export interface ApiSector {
  id: string
  name: string
  code: string
  unitId: string
  unitName: string
  manager?: string | null
  costCenter?: string | null
  color: string
}

/** Shape mínimo que este módulo espera de `GET/POST /computers`. */
export interface ApiComputer {
  id: string
  assetTag: string
  hostname: string
  serialNumber: string
  model: string
  manufacturer: string
  assignment: {
    employeeName: string
    employeeEmail: string
    sectorId: string
    unitId: string
    location?: string | null
  }
  hardware: {
    processor: string
    ramGb: number
    ramDetail?: string | null
    storageType: string
    storageGb: number
    storageDetail?: string | null
    gpu?: string | null
    powerSupply?: string | null
    motherboard?: string | null
    acquisitionDate: string
  }
  system: {
    windowsVersion: string
    windowsBuild: string
    officeVersion?: string | null
    antivirus?: string | null
    lastWindowsUpdate?: string | null
    domainJoined: boolean
  }
  warranty: {
    supplier?: string | null
    invoiceNumber?: string | null
    warrantyUntil?: string | null
    purchaseValue?: number | null
  }
  status: Computer['status']
  notes?: string | null
  photoUrl?: string | null
  qrPayload: string
  lastMaintenanceAt?: string | null
  nextMaintenanceAt?: string | null
  maintenanceIntervalDays: number
  latestHealth?: Computer['health']
  createdAt: string
  updatedAt: string
}

export function mapApiSector(api: ApiSector): Sector {
  return {
    id: api.id,
    name: api.name,
    code: api.code,
    unit: api.unitName,
    manager: api.manager ?? undefined,
    costCenter: api.costCenter ?? undefined,
    color: api.color,
  }
}

/** `undefined`/string vazio → `undefined`, para não mandar `""` onde o backend espera `null`. */
function blankToUndefined(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined
}

/**
 * Corpo aceito por `POST /computers` e `PUT /computers/{id}`
 * (`ComputerCreateRequest`/`ComputerUpdateRequest` no backend).
 */
export interface ComputerWriteRequest {
  assetTag: string
  hostname: string
  serialNumber: string
  model: string
  manufacturer: string
  assignment: {
    employeeName: string
    employeeEmail: string
    sectorId: string
    unitId: string
    location?: string
  }
  hardware: {
    processor: string
    ramGb: number
    ramDetail?: string
    storageType: string
    storageGb: number
    storageDetail?: string
    gpu?: string
    powerSupply?: string
    motherboard?: string
    acquisitionDate: string
  }
  system: {
    windowsVersion: string
    windowsBuild: string
    officeVersion?: string
    antivirus?: string
    lastWindowsUpdate?: string
    domainJoined: boolean
  }
  warranty: {
    supplier?: string
    invoiceNumber?: string
    warrantyUntil?: string
    purchaseValue?: number
  }
  status: Computer['status']
  notes?: string
  photoUrl?: string
  maintenanceIntervalDays: number
}

/**
 * Converte o formulário (`ComputerInput`, shape de tela) para o corpo que a
 * API espera. `unitId` não existe no formulário (que só guarda o nome da
 * unidade) — quem chama resolve a partir do setor escolhido, via
 * `useRealInventory().apiSectors`.
 */
export function toComputerWriteRequest(values: ComputerInput, unitId: string): ComputerWriteRequest {
  return {
    assetTag: values.assetTag,
    hostname: values.hostname,
    serialNumber: values.serialNumber,
    model: values.model,
    manufacturer: values.manufacturer,
    assignment: {
      employeeName: values.assignment.employeeName,
      employeeEmail: values.assignment.employeeEmail,
      sectorId: values.assignment.sectorId,
      unitId,
      location: blankToUndefined(values.assignment.location),
    },
    hardware: {
      processor: values.hardware.processor,
      ramGb: values.hardware.ramGb,
      ramDetail: blankToUndefined(values.hardware.ramDetail),
      storageType: values.hardware.storageType,
      storageGb: values.hardware.storageGb,
      storageDetail: blankToUndefined(values.hardware.storageDetail),
      gpu: blankToUndefined(values.hardware.gpu),
      powerSupply: undefined,
      motherboard: undefined,
      acquisitionDate: values.hardware.acquisitionDate,
    },
    system: {
      windowsVersion: values.system.windowsVersion,
      windowsBuild: values.system.windowsBuild,
      officeVersion: blankToUndefined(values.system.officeVersion),
      antivirus: blankToUndefined(values.system.antivirus),
      lastWindowsUpdate: blankToUndefined(values.system.lastWindowsUpdate),
      domainJoined: values.system.domainJoined,
    },
    warranty: {
      supplier: blankToUndefined(values.warranty.supplier),
      invoiceNumber: blankToUndefined(values.warranty.invoiceNumber),
      warrantyUntil: blankToUndefined(values.warranty.warrantyUntil),
      purchaseValue: values.warranty.purchaseValue,
    },
    status: values.status,
    notes: blankToUndefined(values.notes),
    photoUrl: blankToUndefined(values.photoUrl),
    maintenanceIntervalDays: values.maintenanceIntervalDays,
  }
}

export function mapApiComputer(api: ApiComputer): Computer {
  return {
    id: api.id,
    assetTag: api.assetTag,
    hostname: api.hostname,
    serialNumber: api.serialNumber,
    model: api.model,
    manufacturer: api.manufacturer,
    assignment: {
      employeeName: api.assignment.employeeName,
      employeeEmail: api.assignment.employeeEmail,
      sectorId: api.assignment.sectorId,
      // unitId do backend nao tem equivalente direto no tipo de tela (que
      // guarda o *nome* da unidade); ComputerHeader/Overview resolvem via
      // `sector.unit`, entao um placeholder aqui nao afeta a exibicao.
      unit: '',
      location: api.assignment.location ?? undefined,
    },
    hardware: {
      processor: api.hardware.processor,
      ramGb: api.hardware.ramGb,
      ramDetail: api.hardware.ramDetail ?? undefined,
      storageType: api.hardware.storageType as Computer['hardware']['storageType'],
      storageGb: api.hardware.storageGb,
      storageDetail: api.hardware.storageDetail ?? undefined,
      gpu: api.hardware.gpu ?? undefined,
      powerSupply: api.hardware.powerSupply ?? undefined,
      motherboard: api.hardware.motherboard ?? undefined,
      acquisitionDate: api.hardware.acquisitionDate,
    },
    system: {
      windowsVersion: api.system.windowsVersion,
      windowsBuild: api.system.windowsBuild,
      officeVersion: api.system.officeVersion ?? undefined,
      antivirus: api.system.antivirus ?? undefined,
      lastWindowsUpdate: api.system.lastWindowsUpdate ?? undefined,
      domainJoined: api.system.domainJoined,
    },
    warranty: {
      supplier: api.warranty.supplier ?? undefined,
      invoiceNumber: api.warranty.invoiceNumber ?? undefined,
      warrantyUntil: api.warranty.warrantyUntil ?? undefined,
      purchaseValue: api.warranty.purchaseValue ?? undefined,
    },
    status: api.status,
    notes: api.notes ?? undefined,
    photoUrl: api.photoUrl ?? undefined,
    qrPayload: api.qrPayload,
    lastMaintenanceAt: api.lastMaintenanceAt ?? undefined,
    nextMaintenanceAt: api.nextMaintenanceAt ?? undefined,
    maintenanceIntervalDays: api.maintenanceIntervalDays,
    health: api.latestHealth ?? undefined,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  }
}
