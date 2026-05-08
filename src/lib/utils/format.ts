import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR })
}

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function parseBrDate(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const [, day, month, year] = match
  const d = new Date(Number(year), Number(month) - 1, Number(day))
  return isNaN(d.getTime()) ? null : d
}

export function parseBrCurrency(value: string): number {
  // "1.234,56" → 1234.56 / "-1.234,56" → -1234.56
  const clean = value.replace(/\./g, '').replace(',', '.')
  return parseFloat(clean)
}
