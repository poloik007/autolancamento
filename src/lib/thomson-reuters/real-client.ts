import type { ITRClient } from './client'
import type { TRCompany, TRSubmissionPayload, TRResponse } from './types'

// TODO: implement when TR Domínio Web API credentials are available
// Required env vars: TR_API_BASE_URL, TR_API_KEY, TR_CLIENT_ID

export const realClient: ITRClient = {
  async listCompanies(): Promise<TRCompany[]> {
    // TODO: GET ${TR_API_BASE_URL}/companies
    throw new Error('TR real client not implemented yet. Set TR_USE_MOCK=true')
  },

  async sendStatement(payload: TRSubmissionPayload): Promise<TRResponse> {
    // TODO: POST ${TR_API_BASE_URL}/statements
    void payload
    throw new Error('TR real client not implemented yet. Set TR_USE_MOCK=true')
  },

  async getStatus(referenceId: string): Promise<TRResponse> {
    // TODO: GET ${TR_API_BASE_URL}/statements/${referenceId}
    void referenceId
    throw new Error('TR real client not implemented yet. Set TR_USE_MOCK=true')
  },
}
