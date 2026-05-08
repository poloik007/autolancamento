import type { TRCompany, TRSubmissionPayload, TRResponse } from './types'

export interface ITRClient {
  listCompanies(): Promise<TRCompany[]>
  sendStatement(payload: TRSubmissionPayload): Promise<TRResponse>
  getStatus(referenceId: string): Promise<TRResponse>
}

export function getTRClient(): ITRClient {
  if (process.env.TR_USE_MOCK !== 'false') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./mock-client').mockClient
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./real-client').realClient
}
