export interface TRCompany {
  id: string
  name: string
  cnpj?: string
}

export interface TRTransaction {
  date: string
  description: string
  amount: number
  type: 'D' | 'C'
  documentNumber?: string
}

export interface TRSubmissionPayload {
  companyId: string
  periodStart: string
  periodEnd: string
  statementType: 'checking' | 'savings'
  transactions: TRTransaction[]
}

export interface TRResponse {
  success: boolean
  referenceId?: string
  error?: { code: string; message: string }
}
