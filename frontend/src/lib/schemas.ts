/**
 * Vellor Care — Schemas de validação de formulários (Zod v3).
 *
 * Todos os schemas aqui são a fonte de verdade da validação client-side
 * (react-hook-form + @hookform/resolvers/zod). As mensagens são exibidas
 * diretamente ao usuário, portanto ficam em português do Brasil.
 *
 * Os enums são construídos a partir dos arrays `as const` de `@/lib/types`,
 * garantindo que front-end e back-end nunca divirjam nos valores aceitos.
 */

import { z } from 'zod'

import {
  COMPUTER_STATUS,
  MAINTENANCE_STATUS,
  MAINTENANCE_TYPE,
  MOVEMENT_TYPE,
  PART_CATEGORY,
  PRIORITY,
  STORAGE_TYPE,
  USER_ROLE,
} from '@/lib/types'

// ============================================================================
// Helpers
// ============================================================================

/**
 * Campo de texto opcional vindo de um `<input>`: aceita `undefined` (nunca
 * preenchido) ou string vazia (preenchido e depois apagado pelo usuário).
 */
const optionalText = () => z.string().optional().or(z.literal(''))

/**
 * Número vindo de um `<input>` (string). A coerção transforma `undefined` em
 * `NaN`, então `invalid_type_error` cobre também o campo em branco.
 */
const numberField = (message = 'Informe um número válido') =>
  z.coerce.number({ invalid_type_error: message, required_error: message })

/**
 * Enum a partir de uma tupla `as const`. O `errorMap` garante mensagem em
 * português tanto para campo em branco quanto para valor fora da lista —
 * `invalid_type_error` sozinho não cobre `invalid_enum_value`.
 */
const enumField = <T extends readonly [string, ...string[]]>(
  values: T,
  required: string,
  invalid: string,
) =>
  z.enum(values, {
    errorMap: (issue) => ({
      message: issue.code === z.ZodIssueCode.invalid_type ? required : invalid,
    }),
  })

// ============================================================================
// Enums reutilizáveis
// ============================================================================

const computerStatusEnum = enumField(COMPUTER_STATUS, 'Selecione o status', 'Status inválido')

const storageTypeEnum = enumField(
  STORAGE_TYPE,
  'Selecione o tipo de armazenamento',
  'Tipo de armazenamento inválido',
)

const maintenanceTypeEnum = enumField(
  MAINTENANCE_TYPE,
  'Selecione o tipo de manutenção',
  'Tipo de manutenção inválido',
)

const maintenanceStatusEnum = enumField(
  MAINTENANCE_STATUS,
  'Selecione a situação',
  'Situação inválida',
)

const priorityEnum = enumField(PRIORITY, 'Selecione a prioridade', 'Prioridade inválida')

const userRoleEnum = enumField(
  USER_ROLE,
  'Selecione o perfil de acesso',
  'Perfil de acesso inválido',
)

const partCategoryEnum = enumField(PART_CATEGORY, 'Selecione a categoria', 'Categoria inválida')

const movementTypeEnum = enumField(
  MOVEMENT_TYPE,
  'Selecione o tipo de movimentação',
  'Tipo de movimentação inválido',
)

// ============================================================================
// 1. Computador — cadastro / edição
// ============================================================================

/** Bloco "Responsável" da ficha do computador. */
export const computerAssignmentSchema = z.object({
  employeeName: z.string().min(2, 'Informe o nome do colaborador'),
  employeeEmail: z.string().email('E-mail inválido'),
  sectorId: z.string().min(1, 'Selecione o setor'),
  unit: z.string().min(1, 'Selecione a unidade'),
  location: optionalText(),
})

/** Bloco "Hardware" da ficha do computador. */
export const computerHardwareSchema = z.object({
  processor: z.string().min(2, 'Informe o processador'),
  ramGb: numberField('Informe a memória RAM')
    .int('A memória deve ser um número inteiro')
    .positive('A memória deve ser maior que zero')
    .max(1024, 'A memória não pode passar de 1024 GB'),
  ramDetail: optionalText(),
  storageType: storageTypeEnum,
  storageGb: numberField('Informe o armazenamento')
    .int('O armazenamento deve ser um número inteiro')
    .positive('O armazenamento deve ser maior que zero'),
  storageDetail: optionalText(),
  gpu: optionalText(),
  powerSupply: optionalText(),
  motherboard: optionalText(),
  acquisitionDate: z.string().min(1, 'Informe a data de aquisição'),
})

/** Bloco "Sistema" da ficha do computador. */
export const computerSystemSchema = z.object({
  windowsVersion: z.string().min(1, 'Informe a versão do Windows'),
  windowsBuild: z.string().min(1, 'Informe o build do Windows'),
  officeVersion: optionalText(),
  antivirus: optionalText(),
  lastWindowsUpdate: optionalText(),
  domainJoined: z.boolean().default(false),
})

/** Bloco "Garantia e compra" da ficha do computador. */
export const computerWarrantySchema = z.object({
  supplier: optionalText(),
  invoiceNumber: optionalText(),
  warrantyUntil: optionalText(),
  purchaseValue: numberField('Informe um valor válido')
    .nonnegative('O valor não pode ser negativo')
    .optional(),
})

export const computerSchema = z.object({
  assetTag: z.string().min(2, 'Informe o patrimônio'),
  hostname: z
    .string()
    .min(2, 'Informe o hostname')
    .regex(/^[A-Za-z0-9._-]+$/, 'Hostname inválido'),
  serialNumber: z.string().min(2, 'Informe o número de série'),
  model: z.string().min(2, 'Informe o modelo'),
  manufacturer: z.string().min(2, 'Informe o fabricante'),
  status: computerStatusEnum,
  notes: optionalText(),
  photoUrl: z.string().url('URL da foto inválida').optional().or(z.literal('')),
  maintenanceIntervalDays: numberField('Informe o intervalo de preventiva')
    .int('O intervalo deve ser um número inteiro')
    .min(15, 'O intervalo mínimo é de 15 dias')
    .max(365, 'O intervalo máximo é de 365 dias')
    .default(90),
  assignment: computerAssignmentSchema,
  hardware: computerHardwareSchema,
  system: computerSystemSchema,
  warranty: computerWarrantySchema,
})

export type ComputerInput = z.infer<typeof computerSchema>
export type ComputerAssignmentInput = z.infer<typeof computerAssignmentSchema>
export type ComputerHardwareInput = z.infer<typeof computerHardwareSchema>
export type ComputerSystemInput = z.infer<typeof computerSystemSchema>
export type ComputerWarrantyInput = z.infer<typeof computerWarrantySchema>

// ============================================================================
// 2. Item de checklist
// ============================================================================

export const checklistItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  group: z.string(),
  done: z.boolean(),
  value: z.coerce.number({ invalid_type_error: 'Valor inválido' }).optional(),
  note: z.string().optional(),
})

export type ChecklistItemInput = z.infer<typeof checklistItemSchema>

// ============================================================================
// 3. Manutenção — criação / agendamento
// ============================================================================

export const maintenanceSchema = z.object({
  computerId: z.string().min(1, 'Selecione o computador'),
  technicianId: z.string().min(1, 'Selecione o técnico'),
  type: maintenanceTypeEnum,
  priority: priorityEnum,
  scheduledFor: z.string().min(1, 'Informe a data'),
  notes: optionalText(),
})

export type MaintenanceInput = z.infer<typeof maintenanceSchema>

// ============================================================================
// 4. Execução da preventiva (checklist + evidências)
// ============================================================================

/** Grupo de itens que exige valor numérico medido quando concluídos. */
const MEASUREMENT_GROUP = 'MEDICOES'

export const checklistPartUsageSchema = z.object({
  partId: z.string().min(1, 'Selecione a peça'),
  quantity: numberField('Informe a quantidade')
    .int('A quantidade deve ser um número inteiro')
    .min(1, 'A quantidade mínima é 1'),
})

export const checklistFormSchema = z
  .object({
    items: z.array(checklistItemSchema).min(1, 'O checklist não pode estar vazio'),
    notes: z.string().optional(),
    durationMinutes: numberField('Informe o tempo gasto')
      .int('O tempo deve ser um número inteiro')
      .min(1, 'Informe o tempo gasto')
      .max(1440, 'O tempo não pode passar de 1440 minutos'),
    parts: z.array(checklistPartUsageSchema).default([]),
    signatureDataUrl: z.string().min(1, 'Assinatura do técnico é obrigatória'),
    photosBefore: z.array(z.string()).default([]),
    photosAfter: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    data.items.forEach((item, index) => {
      const missingValue = item.value === undefined || Number.isNaN(item.value)

      if (item.group === MEASUREMENT_GROUP && item.done && missingValue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', index, 'value'],
          message: 'Informe o valor medido',
        })
      }
    })
  })

export type ChecklistPartUsageInput = z.infer<typeof checklistPartUsageSchema>
export type ChecklistFormInput = z.infer<typeof checklistFormSchema>

// ============================================================================
// 5. Peça de estoque
// ============================================================================

export const partSchema = z.object({
  sku: z.string().min(2, 'Informe o SKU'),
  name: z.string().min(2, 'Informe o nome da peça'),
  category: partCategoryEnum,
  quantity: numberField('Informe a quantidade')
    .int('A quantidade deve ser um número inteiro')
    .min(0, 'A quantidade não pode ser negativa'),
  minimumQuantity: numberField('Informe a quantidade mínima')
    .int('A quantidade mínima deve ser um número inteiro')
    .min(0, 'A quantidade mínima não pode ser negativa'),
  unit: z.string().min(1, 'Informe a unidade').default('un'),
  supplier: optionalText(),
  unitValue: numberField('Informe o valor unitário').min(0, 'O valor não pode ser negativo'),
  location: optionalText(),
  notes: optionalText(),
})

export type PartInput = z.infer<typeof partSchema>

// ============================================================================
// 6. Movimentação de estoque
// ============================================================================

export const movementSchema = z.object({
  partId: z.string().min(1, 'Selecione a peça'),
  type: movementTypeEnum,
  quantity: numberField('Informe a quantidade')
    .int('A quantidade deve ser um número inteiro')
    .min(1, 'A quantidade mínima é 1'),
  reason: optionalText(),
  maintenanceId: optionalText(),
})

export type MovementInput = z.infer<typeof movementSchema>

// ============================================================================
// 7. Usuário
// ============================================================================

export const userSchema = z.object({
  name: z.string().min(2, 'Informe o nome'),
  email: z.string().email('E-mail inválido'),
  role: userRoleEnum,
  sectorId: optionalText(),
  phone: optionalText(),
  active: z.boolean().default(true),
})

export type UserInput = z.infer<typeof userSchema>

// ============================================================================
// 8. Login
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres'),
  remember: z.boolean().default(false),
})

export type LoginInput = z.infer<typeof loginSchema>

// ============================================================================
// 9. Setor
// ============================================================================

export const sectorSchema = z.object({
  name: z.string().min(2, 'Informe o nome do setor'),
  code: z
    .string()
    .min(2, 'Informe o código do setor')
    .max(12, 'O código deve ter no máximo 12 caracteres'),
  unit: z.string().min(2, 'Informe a unidade'),
  manager: optionalText(),
  costCenter: optionalText(),
  color: z.string().min(1, 'Selecione uma cor'),
})

export type SectorInput = z.infer<typeof sectorSchema>

// ============================================================================
// 10. Reagendamento
// ============================================================================

export const rescheduleSchema = z.object({
  maintenanceId: z.string().min(1, 'Selecione a manutenção'),
  scheduledFor: z.string().min(1, 'Informe a nova data'),
  reason: optionalText(),
})

export type RescheduleInput = z.infer<typeof rescheduleSchema>

// ============================================================================
// 11. Filtro de relatórios
// ============================================================================

export const reportFilterSchema = z.object({
  from: z.string().min(1, 'Informe a data inicial'),
  to: z.string().min(1, 'Informe a data final'),
  sectorId: optionalText(),
  technicianId: optionalText(),
  type: maintenanceTypeEnum.optional(),
  status: maintenanceStatusEnum.optional(),
  computerId: optionalText(),
})

export type ReportFilterInput = z.infer<typeof reportFilterSchema>
