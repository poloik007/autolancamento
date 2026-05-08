export type UserRole = 'admin' | 'client'
export type SubmissionStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'sent_to_tr' | 'tr_failed'
export type TransactionType = 'debit' | 'credit'
export type NotificationType = 'submission_pending' | 'submission_rejected' | 'submission_approved' | 'submission_sent'
export type PdfType = 'digital' | 'scanned'
export type StatementType = 'debit' | 'credit' | 'both'

export interface DbUser {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DbCompany {
  id: string
  tr_company_id: string
  name: string
  cnpj: string | null
  is_active: boolean
  synced_at: string
  created_at: string
}

export interface DbClientCompanyAccess {
  id: string
  user_id: string
  company_id: string
  is_active: boolean
  granted_by: string | null
  granted_at: string
}

export interface DbSubmission {
  id: string
  user_id: string
  company_id: string
  status: SubmissionStatus
  pdf_path: string
  pdf_filename: string
  pdf_type: PdfType | null
  statement_type: StatementType | null
  period_start: string | null
  period_end: string | null
  rejection_note: string | null
  tr_response: Record<string, unknown> | null
  tr_sent_at: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export interface DbSubmissionTransaction {
  id: string
  submission_id: string
  transaction_date: string
  description: string
  amount: number
  transaction_type: TransactionType
  balance: number | null
  document_number: string | null
  raw_text: string | null
  is_edited: boolean
  sort_order: number
  created_at: string
}

export interface DbNotification {
  id: string
  user_id: string
  type: NotificationType
  submission_id: string | null
  message: string
  is_read: boolean
  created_at: string
}

export interface DbAuditLog {
  id: string
  actor_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}
