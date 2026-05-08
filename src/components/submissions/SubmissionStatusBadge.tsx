import { Badge } from '@/components/ui/badge'
import type { SubmissionStatus } from '@/types/database'

const config: Record<SubmissionStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft:      { label: 'Rascunho',       variant: 'outline' },
  pending:    { label: 'Aguardando',     variant: 'secondary' },
  approved:   { label: 'Aprovado',       variant: 'default' },
  rejected:   { label: 'Rejeitado',      variant: 'destructive' },
  sent_to_tr: { label: 'Enviado ao TR',  variant: 'default' },
  tr_failed:  { label: 'Falha no TR',    variant: 'destructive' },
}

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  const { label, variant } = config[status]
  return <Badge variant={variant}>{label}</Badge>
}
