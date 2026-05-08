'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown, Building2 } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCompanies } from '@/hooks/useCompanies'
import type { DbCompany } from '@/types/database'

interface CompanySelectorProps {
  value: DbCompany | null
  onChange: (company: DbCompany | null) => void
}

export function CompanySelector({ value, onChange }: CompanySelectorProps) {
  const [open, setOpen] = useState(false)
  const { companies, loading } = useCompanies()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(buttonVariants({ variant: 'outline' }), 'min-w-[260px] justify-between font-normal')}
        aria-expanded={open}
        disabled={loading}
      >
        {value ? (
          <span className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            {value.name}
          </span>
        ) : (
          <span className="text-muted-foreground">
            {loading ? 'Carregando...' : 'Selecione a empresa...'}
          </span>
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>

      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar empresa..." />
          <CommandList>
            <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
            <CommandGroup>
              {companies.map((company) => (
                <CommandItem
                  key={company.id}
                  value={company.name}
                  onSelect={() => {
                    onChange(company.id === value?.id ? null : company)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value?.id === company.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{company.name}</span>
                    {company.cnpj && (
                      <span className="text-xs text-muted-foreground">{company.cnpj}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
