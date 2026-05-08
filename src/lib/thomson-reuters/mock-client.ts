import type { ITRClient } from './client'
import type { TRCompany, TRSubmissionPayload, TRResponse } from './types'

const MOCK_COMPANIES: TRCompany[] = [
  { id: 'tr-001', name: 'Empresa Alfa Ltda', cnpj: '12.345.678/0001-90' },
  { id: 'tr-002', name: 'Beta Comércio S.A.', cnpj: '98.765.432/0001-10' },
  { id: 'tr-003', name: 'Gama Serviços ME', cnpj: '11.222.333/0001-44' },
  { id: 'tr-004', name: 'Delta Indústria Ltda', cnpj: '44.555.666/0001-77' },
  { id: 'tr-005', name: 'Ômega Tecnologia S.A.', cnpj: '55.666.777/0001-88' },
]

export const mockClient: ITRClient = {
  async listCompanies(): Promise<TRCompany[]> {
    console.log('[TR Mock] listCompanies called')
    return MOCK_COMPANIES
  },

  async sendStatement(payload: TRSubmissionPayload): Promise<TRResponse> {
    console.log('[TR Mock] sendStatement called', JSON.stringify(payload, null, 2))
    return { success: true, referenceId: `mock-${Date.now()}` }
  },

  async getStatus(referenceId: string): Promise<TRResponse> {
    console.log('[TR Mock] getStatus called', referenceId)
    return { success: true, referenceId }
  },
}
