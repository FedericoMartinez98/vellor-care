/**
 * Vellor Care — Ponto de entrada do store.
 *
 * As telas importam sempre daqui (`@/lib/store`): o provider, o hook reativo e
 * os seletores derivados puros.
 */

export {
  DataProvider,
  useVellor,
  type CompleteMaintenancePayload,
  type VellorStore,
} from '@/lib/store/data-provider'

export * from './selectors'
