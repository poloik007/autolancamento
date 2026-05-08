'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PdfDropzoneProps {
  onFile: (file: File) => void
  disabled?: boolean
}

export function PdfDropzone({ onFile, disabled }: PdfDropzoneProps) {
  const [selected, setSelected] = useState<File | null>(null)

  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0]
      if (!file) return
      setSelected(file)
      onFile(file)
    },
    [onFile]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled,
  })

  if (selected) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg border bg-white">
        <FileText className="h-5 w-5 text-blue-500 shrink-0" />
        <span className="text-sm flex-1 truncate">{selected.name}</span>
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="text-muted-foreground hover:text-foreground"
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex flex-col items-center justify-center gap-3 p-10 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
        isDragActive
          ? 'border-primary bg-primary/5'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input {...getInputProps()} />
      <Upload className="h-8 w-8 text-muted-foreground" />
      <div className="text-center">
        <p className="text-sm font-medium">
          {isDragActive ? 'Solte o arquivo aqui' : 'Arraste o PDF ou clique para selecionar'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">Somente arquivos PDF</p>
      </div>
    </div>
  )
}
