'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { DbUser, DbCompany } from '@/types/database'

interface ClientEditorProps {
  client: DbUser
  allCompanies: DbCompany[]
  assignedCompanyIds: string[]
}

export function ClientEditor({ client, allCompanies, assignedCompanyIds }: ClientEditorProps) {
  const [isActive, setIsActive] = useState(client.is_active)
  const [notes, setNotes] = useState(client.notes ?? '')
  const [assigned, setAssigned] = useState(new Set(assignedCompanyIds))
  const [saving, setSaving] = useState(false)

  async function handleSaveProfile() {
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive, notes }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      toast.success('Perfil atualizado!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  async function toggleCompany(companyId: string) {
    const willAssign = !assigned.has(companyId)
    try {
      const res = await fetch(`/api/companies/${companyId}/access`, {
        method: willAssign ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: client.id }),
      })
      if (!res.ok) throw new Error()
      setAssigned((prev) => {
        const next = new Set(prev)
        willAssign ? next.add(companyId) : next.delete(companyId)
        return next
      })
      toast.success(willAssign ? 'Empresa atribuída' : 'Empresa removida')
    } catch {
      toast.error('Erro ao atualizar acesso')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold">Configurações</h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Status da conta</p>
            <p className="text-xs text-muted-foreground">Contas inativas não podem fazer login</p>
          </div>
          <button
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Observações internas</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas sobre o cliente (visível apenas para admins)..."
            rows={3}
          />
        </div>

        <Button onClick={handleSaveProfile} disabled={saving} size="sm">
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <div className="rounded-lg border bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold">Empresas com acesso</h2>
        {allCompanies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma empresa sincronizada. Vá para a aba Empresas e clique em Sincronizar.
          </p>
        ) : (
          <div className="space-y-1.5">
            {allCompanies.map((company) => {
              const isAssigned = assigned.has(company.id)
              return (
                <div
                  key={company.id}
                  className="flex items-center justify-between px-3 py-2 rounded-md border hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm">{company.name}</p>
                    {company.cnpj && <p className="text-xs text-muted-foreground">{company.cnpj}</p>}
                  </div>
                  <button
                    onClick={() => toggleCompany(company.id)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${
                      isAssigned
                        ? 'border-green-200 bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                        : 'border-gray-200 text-muted-foreground hover:bg-green-50 hover:text-green-700 hover:border-green-200'
                    }`}
                  >
                    {isAssigned ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {isAssigned ? 'Atribuída' : 'Atribuir'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
